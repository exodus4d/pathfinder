<?php

class Cron extends \Prefab {

    //@{ Error messages
    const
        E_Undefined='Undefined property: %s::$%s',
        E_Invalid='"%s" is not a valid name: it should only contain alphanumeric characters',
        E_NotFound='Job %s doesn\'t exist',
        E_Callable='Job %s cannot be called';
    //@}

    //@{ Log message
    const
        L_Execution='%s (%.3F s)';
    //@}

    /** @var bool */
    public $log=FALSE;

    /** @var bool */
    public $web=FALSE;

    /** @var bool */
    public $silent=TRUE;

    /** @var string Script path */
    public $script='index.php';

    /** @var string PHP CLI path */
    protected $binary;

    /** @var array */
    protected $jobs=array();

    /** @var array */
    protected $presets=array(
        'yearly'=>'0 0 1 1 *',
        'annually'=>'0 0 1 1 *',
        'monthly'=>'0 0 1 * *',
        'weekly'=>'0 0 * * 0',
        'daily'=>'0 0 * * *',
        'hourly'=>'0 * * * *',
    );

    /** @var bool */
    private $windows;

    /**
     * Set binary path after checking that it can be executed and is CLI
     * @param string $path
     * @return string
     */
    function binary($path) {
        if (function_exists('exec')) {
            exec($path.' -v 2>&1',$out,$ret);
            if ($ret==0 && preg_match('/cli/',@$out[0],$out))
                $this->binary=$path;
        }
        return $this->binary;
    }

    /**
     * Schedule a job
     * @param string $job
     * @param string $handler
     * @param string $expr
     */
    function set($job,$handler,$expr) {
        if (!preg_match('/^[\w\-]+$/',$job))
            user_error(sprintf(self::E_Invalid,$job),E_USER_ERROR);
        $this->jobs[$job]=array($handler,$expr);
    }

    /**
     * Define a schedule preset
     * @param string $name
     * @param string $expr
     */
    function preset($name,$expr) {
        $this->presets[$name]=$expr;
    }

    /**
     * Returns TRUE if the requested job is due at the given time
     * @param string $job
     * @param int $time
     * @return bool
     */
    function isDue($job,$time) {
        if (!isset($this->jobs[$job]) || !$parts=$this->parseExpr($this->jobs[$job][1]))
            return FALSE;
        foreach($this->parseTimestamp($time) as $i=>$k)
            if (!in_array($k,$parts[$i]))
                return FALSE;
        return TRUE;
    }

    /**
     * Execute a job
     * @param string $job
     * @param bool $async
     * @return bool TRUE = job has been executed / FALSE = job has been delegated to a background process
     */
    function execute($job,$async=TRUE) {
        if (!isset($this->jobs[$job]))
            user_error(sprintf(self::E_NotFound,$job),E_USER_ERROR);
        $f3=\Base::instance();
        if (is_string($func=$this->jobs[$job][0]))
            $func=$f3->grab($func);
        if (!is_callable($func))
            user_error(sprintf(self::E_Callable,$job),E_USER_ERROR);
        if ($async && isset($this->binary)) {
            // PHP docs: If a program is started with this function, in order for it to continue running in the background,
            // the output of the program must be redirected to a file or another output stream.
            // Failing to do so will cause PHP to hang until the execution of the program ends.
            $dir=dirname($this->script);
            $file=basename($this->script);
            if (!preg_match($this->windows?'/^[A-Z]:\\\\/i':'/^\//',$dir))
                $dir=getcwd().'/'.$dir;
            if ($this->windows) {
                pclose(popen(sprintf('start /b "cron" "%s" "%s\\%s" "/cron/%s"',$this->binary,$dir,$file,$job),'r'));
            } else {
                exec(sprintf('cd "%s" && %s %s /cron/%s >/dev/null 2>/dev/null &',$dir,$this->binary,$file,$job));
            }
            return FALSE;
        }
        $start=microtime(TRUE);
        call_user_func_array($func,array($f3));
        if ($this->log) {
            $log=new Log('cron.log');
            $log->write(sprintf(self::L_Execution,$job,microtime(TRUE)-$start));
        }
        return TRUE;
    }

    /**
     * Run scheduler, i.e executes all due jobs at a given time
     * @param int $time
     * @param bool $async
     * @return array List of executed jobs
     */
    function run($time=NULL,$async=TRUE) {
        if (!isset($time))
            $time=time();
        $exec=array();
        foreach(array_keys($this->jobs) as $job)
            if ($this->isDue($job,$time))
                $exec[$job]=$this->execute($job,$async);
        return $exec;
    }

    /**
     * Route controller code
     * @param \Base $f3
     * @param array $params
     */
    function route($f3,$params) {
        if (PHP_SAPI!='cli' && !$this->web)
            $f3->error(404);
        $exec=isset($params['job'])?
            array($params['job']=>$this->execute($params['job'],FALSE)):
            $this->run();
        if (!$this->silent) {
            if (PHP_SAPI!='cli')
                header('Content-Type: text/plain');
            if (!$exec)
                die('Nothing to do');
            foreach($exec as $job=>$ok)
                echo sprintf('%s [%s]',$job,$ok?'OK':'async')."\r\n";
        }
    }

    /**
     * Parse a timestamp
     * @param int $time
     * @return array
     */
    function parseTimestamp($time) {
        return array(
            (int)date('i',$time),//minute
            (int)date('H',$time),//hour
            (int)date('d',$time),//day of month
            (int)date('m',$time),//month
            (int)date('w',$time),//day of week
        );
    }

    /**
     * Parse a cron expression
     * @param string $expr
     * @return array|FALSE
     */
    function parseExpr($expr) {
        $parts=array();
        if (preg_match('/^@(\w+)$/',$expr,$m)) {
            if (!isset($this->presets[$m[1]]))
                return FALSE;
            $expr=$this->presets[$m[1]];
        }
        $expr=preg_split('/\s+/',$expr,-1,PREG_SPLIT_NO_EMPTY);
        $ranges=array(
            0=>59,//minute
            1=>23,//hour
            2=>31,//day of month
            3=>12,//month
            4=>6,//day of week
        );
        foreach($ranges as $i=>$max)
            if (isset($expr[$i]) && preg_match_all('/(?<=,|^)\h*(?:(\d+)(?:-(\d+))?|(\*))(?:\/(\d+))?\h*(?=,|$)/',
                    $expr[$i],$matches,PREG_SET_ORDER)) {
                $parts[$i]=array();
                foreach($matches as $m) {
                    if (!$range=@range(@$m[3]?0:$m[1],@$m[3]?$max:(@$m[2]?:$m[1]),@$m[4]?:1))
                        return FALSE;//step exceeds specified range
                    $parts[$i]=array_merge($parts[$i],$range);
                }
            } else
                return FALSE;
        return $parts;
    }

    //! Read-only public properties
    function __get($name) {
        if (in_array($name,array('binary','jobs','presets')))
            return $this->$name;
        if ($name=='clipath') // alias for script [deprecated]
            return $this->script;
        trigger_error(sprintf(self::E_Undefined,__CLASS__,$name));
    }

    //! Constructor
    function __construct() {
        $f3=\Base::instance();
        $config=(array)$f3->get('CRON');
        foreach(array('log','web','script','silent') as $k)
            if (isset($config[$k])) {
                settype($config[$k],gettype($this->$k));
                $this->$k=$config[$k];
            }
        if (isset($config['binary']))
            $this->binary($config['binary']);
        if (isset($config['jobs']))
            foreach($config['jobs'] as $job=>$arr) {
                $handler=array_shift($arr);
                $this->set($job,$handler,implode(',',$arr));
            }
        if (isset($config['presets']))
            foreach($config['presets'] as $name=>$expr)
                $this->preset($name,is_array($expr)?implode(',',$expr):$expr);
        if (!isset($this->binary))
            foreach(array('php','php-cli') as $path) // try to guess the binary name
                if ($this->binary($path))
                    break;
        $this->windows=(bool)preg_match('/^win/i',PHP_OS);
        $f3->route(array('GET /cron','GET /cron/@job'),array($this,'route'));
    }

}