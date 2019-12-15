<?php


namespace Exodus4D\Pathfinder\Lib;


class PriorityCacheStore {

    /**
     * default max entry limit before store gets truncated
     */
    const DEFAULT_ENTRY_LIMIT = 100;

    /**
     * default cleanup interval
     * -> truncate store after 10 inserts. Max store entries:
     *    DEFAULT_ENTRY_LIMIT + DEFAULT_CLEANUP_INTERVAL - 1
     */
    const DEFAULT_CLEANUP_INTERVAL = 10;

    /**
     * @var int
     */
    protected $entryLimit;

    /**
     * @var int
     */
    protected $cleanupInterval;

    /**
     * @var array
     */
    protected $store;

    /**
     * @var \SplPriorityQueue
     */
    protected $priorityQueue;

    /**
     * @var int
     */
    protected $priority = 0;

    /**
     * PriorityCacheStore constructor.
     * @param int $entryLimit
     * @param int $cleanupInterval
     */
    function __construct(int $entryLimit = self::DEFAULT_ENTRY_LIMIT, int $cleanupInterval = self::DEFAULT_CLEANUP_INTERVAL){
        $this->cleanupInterval = $cleanupInterval;
        $this->entryLimit = $entryLimit;
        $this->store = [];
        $this->priorityQueue = new \SplPriorityQueue ();
        $this->priorityQueue->setExtractFlags(\SplPriorityQueue::EXTR_BOTH);
    }

    /**
     * @param $key
     * @param $data
     */
    public function set($key, $data){
        if(!$this->exists($key)){
            $this->priorityQueue->insert($key, $this->priority--);
        }

        $this->store[$key] = $data;

        // check cleanup interval and cleanup Store
        $this->cleanupInterval();
    }

    /**
     * @param $key
     * @return mixed|null
     */
    public function get($key){
        return $this->exists($key) ? $this->store[$key] : null;
    }

    /**
     * @param $key
     * @return bool
     */
    public function exists($key){
        return isset($this->store[$key]);
    }

    public function cleanupInterval() : void {
        if(
            !$this->priorityQueue->isEmpty() && $this->cleanupInterval &&
            ($this->priorityQueue->count() % $this->cleanupInterval === 0)
        ){
            $this->cleanup();
        }
    }

    public function cleanup(){
        while(
            $this->entryLimit < $this->priorityQueue->count() &&
            $this->priorityQueue->valid()
        ){
            if($this->exists($key = $this->priorityQueue->extract()['data'])){
                unset($this->store[$key]);
            }
        }
    }

    public function clear(){
        $limit = $this->entryLimit;
        $this->entryLimit = 0;
        $this->cleanup();
        // restore entryLimit for next data
        $this->entryLimit = $limit;
    }

    /**
     * @return string
     */
    public function __toString(){
        return 'Store count: ' . count($this->store) . ' priorityQueue count: ' . $this->priorityQueue->count();
    }
}