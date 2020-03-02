define([
    'easyTimer',
    'app/promises/promise.timeout',
], (easytimer, TimeoutPromise) => {
    'use strict';

    /*
    Example1 run task every second ------------------------------------------------------------------------------------
    let task1 = Cron.new('task1', {precision: 'seconds', interval: 1, timeout: 100});
    task1.task = (timer) => {
        console.info('task1 function():', timer.getTotalTimeValues());
        return 'OK';
    };
    task1.start();

    Example2 run task every 3 seconds ---------------------------------------------------------------------------------
    let task1 = Cron.new('task1', {precision: 'seconds', interval: 3, timeout: 100});
    task1.task = (timer) => {
        console.info('task1 function():', timer.getTotalTimeValues());
        return 'OK';
    };
    task1.start();

    Example3 resolve Promise on run ----------------------------------------------------------------------------------
    let task1 = Cron.new('task1', {precision: 'seconds', interval: 1, timeout: 100});
    task1.task = (timer, task) => {
        return new Promise((resolve, reject) => {
            console.info('task1 Promise1():', timer.getTotalTimeValues(), task.get('interval'));
            //task.set('interval', task.get('interval') + 1) // increase run interval every time by 1s
            resolve('OK1');
        }).then(payload => {
            return new Promise((resolve, reject) => {
                console.info('task2 Promise2():', timer.getTotalTimeValues(), payload);
                resolve('OK2');
            });
        });
    };
    task1.start();

    Example4  run task once at given Date() --------------------------------------------------------------------------
    let dueDate = new Date();
    dueDate.setSeconds(dueDate.getSeconds() + 5);
    let task2 = Cron.new('task2', {precision: 'seconds', timeout: 100, dueDate: dueDate});
    task2.task = () => 'OK task2';
    task2.start();
     */

    /**
     * Task instances represent a task that should be executed at a given interval or dueDate
     * -> Task´s are managed by CronManager()
     * @type {Task}
     */
    let Task = class Task {
        /**
         *
         * @param {string} name
         * @param {{}} config
         * @param {CronManager} manager
         */
        constructor(name, config, manager = null){
            if(typeof name !== 'string'){
                throw new TypeError('Task "name" must be instance of String, Type of "' + typeof name + '" given');
            }
            this._config = Object.assign({}, this.constructor.defaultConfig, config);
            this._name = name;                      // unique name for identification
            this._task = (timer, task) => {};       // task to run, instanceof Function, can also return a Promise
            this._manager = manager;                // reference to CronManager() that handles this task
            this._runCount = 0;                     // counter for run() calls
            this._runQueue = new Map();             // current run() processes. > 1 requires config.isParallel: true
            this._lastTotalTimeValues = undefined;  // time values of last run()
        }

        /**
         * @returns {string}
         */
        get name(){
            return this._name;
        }

        /**
         * @returns {(function())} task
         */
        get task() {
            return this._task;
        }

        /**
         * @param {(function())} task
         */
        set task(task){
            if(task instanceof Function){
                this._task = task;
            }else{
                throw new TypeError('Task "task" must be instance of "function", Type of "' + typeof task + '" given');
            }
        }

        /**
         * @returns {number}
         */
        get runCount(){
            return this._runCount;
        }

        /**
         * @returns {string}
         */
        get precision(){
            return this.get('precision');
        }

        /**
         * @returns {boolean}
         */
        get paused(){
            return this.get('paused');
        }

        /**
         * @returns {boolean}
         */
        get targetAchieved(){
            return this.get('targetRunCount') ?  this.runCount >= this.get('targetRunCount') : false;
        }

        /**
         * @returns {number}
         */
        get targetProgress(){
            return parseFloat(
                parseFloat(
                    (!this.get('targetRunCount') || !this.runCount) ?
                        0 :
                        (100 / this.get('targetRunCount') * this.runCount)
                ).toFixed(2));
        }

        /**
         * @param option
         * @returns {*}
         */
        get(option){
            return this._config[option];
        }

        /**
         * @param {string} option
         * @param {*} value
         */
        set(option, value){
            this._config[option] = value;
        }

        /**
         * connect CronManager with instance
         * @param {CronManager} manager
         */
        connect(manager = this._manager){
            if(manager instanceof CronManager){
                if(manager !== this._manager){
                    // disconnect from current manager (if exists)
                    this.disconnect();
                    this._manager = manager;
                }
                this._manager.set(this);
            }else{
                throw new TypeError('Parameter must be instance of CronManager. Type of "' + typeof manager + '" given');
            }
        }

        /**
         * disconnect from CronManager
         * @param {CronManager} manager
         */
        disconnect(manager = this._manager){
            if(manager instanceof CronManager){
                if(this.isConnected(manager)){
                    this._manager.delete(this._name);
                }
            }else{
                throw new TypeError('Parameter must be instance of CronManager. Type of "' + typeof manager + '" given');
            }
        }

        /**
         * checks if CronManager is connected with instance
         * @param {CronManager} manager
         * @returns {boolean}
         */
        isConnected(manager = this._manager){
            return (manager instanceof CronManager) &&
                manager === this._manager &&
                manager.has(this._name);
        }

        /**
         * if task is currently running
         * @returns {boolean}
         */
        isRunning(){
            return !!this._runQueue.size;
        }

        /**
         * @param timer
         * @returns {boolean}
         */
        isDue(timer){
            if(this.get('dueDate') instanceof Date){
                // run once at dueDate
                if(new Date().getTime() >= this.get('dueDate').getTime()){
                    return true;
                }
            }else{
                // periodic execution
                let totalTimeValues = timer.getTotalTimeValues();
                let totalTimeValuePrecision = totalTimeValues[this.precision];
                totalTimeValuePrecision -= this._lastTotalTimeValues ? this._lastTotalTimeValues[this.precision] : 0;
                if(
                    this.get('interval') === 1 ||
                    totalTimeValuePrecision % this.get('interval') === 0
                ){
                    return true;
                }
            }
            return false;
        }

        /**
         * @param timer
         */
        invoke(timer){
            if(
                !this.paused &&
                this.isDue(timer) &&
                (!this.isRunning() || this.get('isParallel'))
            ){
                this.run(timer);
            }
        }

        /**
         * @param timer
         */
        run(timer){
            this._lastTotalTimeValues = Object.assign({}, timer.getTotalTimeValues());
            let runId = 'run_' + (++this._runCount);
            let runExec = resolve => {
                resolve(this._task(timer, this));
            };

            let myProm = this.get('timeout') > 0 ? new TimeoutPromise(runExec, this.get('timeout')) : new Promise(runExec);
            myProm.then(payload => {
                // resolved within timeout -> wait for finally() block
            }).catch(error => {
                if(error instanceof Error){
                    // either timeout error or error from rejected deferredPromise
                    console.warn(error);
                }
            }).finally(() => {
                // no matter if TimeoutPromise is resolved or rejected
                // -> remove from _runQueue
                this._runQueue.delete(runId);

                if(this.get('dueDate') instanceof Date){
                    this.disconnect();
                }

                if(this.targetAchieved){
                    this.stop();
                }
            });

            this._runQueue.set(runId, myProm);
        }

        // Task controls ----------------------------------------------------------------------------------------------

        start(){
            this.set('paused', false);
            this.connect();
        }

        stop(){
            this.reset();
            this.disconnect();
        }

        pause(){
            this.set('paused', true);
        }

        reset(){
            this._runCount = 0;
        }
    };

    Task.defaultConfig = {
        precision: 'seconds',   // updateEvent this tasked will be subscribed to
        isParallel: false,      // if true this task can run parallel, e.g. if prev execution has not finished
        interval: 1,            // relates to 'precision'. 'interval' = 3 and 'precision' = "seconds" -> run every 3 seconds
        dueDate: undefined,     // if Date() instance is set, task only runs once at dueDate
        timeout: 50,            // if > 0, execution time that exceeds timeout (ms) throw error
        paused: false,          // if true this task will not run() but will be invoce()´ed
        targetRunCount: 0       // if > 0, task will stop if targetRunCount is reached
    };


    /**
     * An instance of CronManager() handles multiple Task()´s
     * -> Task()´s can be set()/delete() from CronManager() instance
     * @type {CronManager}
     */
    let CronManager = class CronManager {

        /**
         * @param {{}} config
         */
        constructor(config){
            this._config = Object.assign({}, this.constructor.defaultConfig, config);
            this._timerConfig = Object.assign({}, this.constructor.defaultTimerConfig);

            this._tasks = new Map();
            this._timer = new easytimer.Timer();

            // init Easytimer update events
            this._config.precisions.map(precision => precision + 'Updated').forEach(eventName => {
                this._timer.on(eventName, e => {
                    let precision = e.type.substring(0, e.type.indexOf('Updated'));
                    this.tasksByPrecision(precision).forEach(task => task.invoke(e.detail.timer));
                });
            });

            this.debug = (msg,...data) => {
                if(this._config.debug){
                    data = (data || []);
                    console.debug(msg, ...data);
                }
            };
        }

        /**
         * @param {string} name
         * @param {{}} config
         * @returns {Task}
         */
        new(name, config){
            return new Task(name, config, this);
        }

        /**
         * @param {Task} task
         */
        set(task){
            if(task instanceof Task){
                // check for unique task name
                if(!this.has(task.name)){
                    // connect new task
                    // -> must be before connect(this)! (prevents infinite loop)
                    this._tasks.set(task.name, task);
                    task.connect(this);

                    this.debug('SET/UPDATE task: %o config: %o', task.name, task);
                    // start timer (if it is not already running)
                    this.auto();
                }
            }else{
                throw new TypeError('Parameter must be instance of Task');
            }
        }

        /**
         * @param {string} name
         * @param {{}} config
         */
        setNew(name, config){
            this.set(this.new(name, config));
        }

        /**
         * @param {string} name
         * @returns {Task|undefined}
         */
        get(name){
            return this._tasks.get(name);
        }

        /**
         * @param {string} name
         * @returns {boolean}
         */
        has(name){
            return this._tasks.has(name);
        }

        /**
         * @param {string} name
         */
        delete(name){
            if(this.has(name)){
                let task = this._tasks.get(name);
                // disconnect task
                // -> must be before disconnect(this)! (prevents infinite loop)
                this._tasks.delete(name);
                task.disconnect(this);

                this.debug('DELETE task: %o', name);
                // stop timer (if no more tasks connected)
                this.auto();
            }
        }

        clear(){
            this.debug('CLEAR all  %o task(s)', this._tasks.size);
            this._tasks.clear();
            this.auto();
        }

        /**
         * @param {string} precision
         * @returns {Task[]}
         */
        tasksByPrecision(precision){
            let tasks = [];
            this._tasks.forEach(task => {
                if(precision === task.precision){
                    tasks.push(task);
                }
            });
            return tasks;
        }

        // EasyTimer controls -----------------------------------------------------------------------------------------
        start(){
            this._timer.start(this._timerConfig);
        }

        stop(){
            this._timer.stop();
        }

        pause(){
            this._timer.pause();
        }

        reset(){
            this._timer.reset();
        }

        auto(){
            if(this._tasks.size){
                if(!this._timer.isRunning()){
                    this.start();
                    this.debug('START [auto] timer. %o task(s) found.', this._tasks.size);
                }
            }else{
                this.stop();
                this.debug('STOP [auto] timer. No tasks set.');
            }
        }
    };

    CronManager.defaultConfig = {
        precisions: [
            'secondTenths',
            'seconds',
            'minutes',
            'hours',
            'days'
        ],
        debug: false               // debug output in console
    };

    CronManager.defaultTimerConfig = {
        precision: 'secondTenths',      // Timer update frequency. Values: 'secondTenths', 'seconds', 'minutes', 'hours'
        countdown: false                // If true, the timer is a countdown
    };

    return new CronManager({
        debug: false
    });
});