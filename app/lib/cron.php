<?php

class Cron extends \Prefab {

    //@{ Error messages
    const
        E_Undefined='Undefined property: %s::$%s',
        E_Invalid='"%s" is not a valid name: it should only contain alphanumeric characters',
        L_Execution='%s (%.3F s)';
    //@}

    /** @var bool */
    public $log=FALSE;

    /** @var bool */
    public $cli=TRUE;

    /** @var bool */
    public $web=FALSE;

    /** @var string */
    public $clipath;

    /** @var array */
    protected $jobs=array();

    /** @var bool */
    protected $async=FALSE;

    /** @var array */
    protected $presets=array(
        'yearly'=>'0 0 1 1 *',
        'annually'=>'0 0 1 1 *',
        'monthly'=>'0 0 1 * *',
        'weekly'=>'0 0 * * 0',
        'daily'=>'0 0 * * *',
        'hourly'=>'0 * * * *',
    );

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
     */
    function execute($job,$async=TRUE) {
        if (!isset($this->jobs[$job]))
            return;
        $f3=\Base::instance();
        if (is_string($func=$this->jobs[$job][0])){
            $func=$f3->grab($func);
        }

        if (!is_callable($func))
            return;
        if ($async && $this->async) {
            // PHP docs: If a program is started with this function, in order for it to continue running in the background,
            // the output of the program must be redirected to a file or another output stream.
            // Failing to do so will cause PHP to hang until the execution of the program ends.
            $dir='';
            $file='index.php';
            if ($this->clipath) {
                $dir=dirname($this->clipath);
                $file=basename($this->clipath);
            }
            if (@$dir[0]!='/')
                $dir=getcwd().'/'.$dir;
            exec(sprintf('cd "%s";php %s /cron/%s > /dev/null 2>/dev/null &',$dir,$file,$job));
        } else {
            $start=microtime(TRUE);
            call_user_func_array($func,array($f3));
            if ($this->log) {
                $log=new Log('cron.log');
                $log->write(sprintf(self::L_Execution,$job,microtime(TRUE)-$start));
            }
        }
    }

    /**
     * Run scheduler, i.e executes all due jobs at a given time
     * @param int $time
     * @param bool $async
     */
    function run($time=NULL,$async=TRUE) {
        if (!isset($time))
            $time=time();
        foreach(array_keys($this->jobs) as $job)
            if ($this->isDue($job,$time))
                $this->execute($job,$async);
    }

    /**
     * Route controller code
     * @param \Base $f3
     * @param array $params
     */
    function route($f3,$params) {

        if (PHP_SAPI=='cli'?!$this->cli:!$this->web)
            $f3->error(404);
        if (isset($params['job']))
            $this->execute($params['job'],FALSE);
        else{
            // IMPORTANT! async does not work on Windows
            // -> my development environment is Windows :((
            $async = FALSE;
            $this->run(NULL, $async);
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
        if (in_array($name,array('jobs','async','presets')))
            return $this->$name;
        trigger_error(sprintf(self::E_Undefined,__CLASS__,$name));
    }

    //! Constructor
    function __construct() {
        $f3=\Base::instance();
        $config=(array)$f3->get('CRON');

        foreach(array('log','cli','web') as $k)
            if (isset($config[$k]))
                $this->$k=(bool)$config[$k];
        foreach(array('clipath') as $k)
            if (isset($config[$k]))
                $this->$k=(string)$config[$k];
        if (isset($config['jobs']))
            foreach($config['jobs'] as $job=>$arr) {
                $handler=array_shift($arr);
                $this->set($job,$handler,implode(',',$arr));
            }
        if (isset($config['presets']))
            foreach($config['presets'] as $name=>$expr)
                $this->preset($name,is_array($expr)?implode(',',$expr):$expr);
        if (function_exists('exec') && exec('php -r "echo 1+3;"')=='4')
            $this->async=TRUE;
        if ($this->cli || $this->web)
            $f3->route(array('GET /cron','GET /cron/@job'),array($this,'route'));
    }

}