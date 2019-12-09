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
    Cron.set(task1);

    Example2 run task every 3 seconds ---------------------------------------------------------------------------------
    let task1 = Cron.new('task1', {precision: 'seconds', interval: 3, timeout: 100});
    task1.task = (timer) => {
        console.info('task1 function():', timer.getTotalTimeValues());
        return 'OK';
    };
    Cron.set(task1);

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
    Cron.set(task1);

    Example4  run task once at given Date() --------------------------------------------------------------------------
    let dueDate = new Date();
    dueDate.setSeconds(dueDate.getSeconds() + 5);
    let task2 = Cron.new('task2', {precision: 'seconds', timeout: 100, dueDate: dueDate});
    task2.task = () => 'OK task2';
    Cron.set(task2);
     */

    /**
     * Task instances represent a task that should be executed at a given interval or dueDate
     * -> Task´s are managed by CronManager()
     * @type {Task}
     */
    let Task = class Task {
        constructor(name, config){
            if(typeof name !== 'string'){
                throw new TypeError('Task "name" must be instance of String, Type of "' + typeof name + '" given');
            }
            this._config = Object.assign({}, this.constructor.defaultConfig, config);
            this._name = name;                      // unique name for identification
            this._task = undefined;                 // task to run, instanceof Function, can also return a Promise
            this._manager = undefined;              // reference to CronManager() that handles this task
            this._runQueue = new Map();             // current run() processes. > 1 requires config.isParallel: true
            this._runCount = 0;                     // total run counter for this task
            this._lastTotalTimeValues = undefined;  // time values of last run()
        }

        get name(){
            return this._name;
        }

        get task(){
            return this._task;
        }

        get runCount(){
            return this._runCount;
        }

        get precision(){
            return this._config.precision;
        }

        set task(task){
            if(task instanceof Function){
                this._task = task;
            }else{
                throw new TypeError('Task "task" must be instance of "function", Type of "' + typeof task + '" given');
            }
        }

        get(option){
            return this._config[option];
        }

        set(option, value){
            this._config[option] = value;
        }

        setManager(manager){
            this._manager = manager;
        }

        isRunning(){
            return !!this._runQueue.size;
        }

        delete(){
            let isDeleted = false;
            if(this._manager){
                isDeleted = this._manager.delete(this.name);
            }
            return isDeleted;
        }

        isDue(timer){
            if(this._config.dueDate instanceof Date){
                // run once at dueDate
                if(new Date().getTime() >= this._config.dueDate.getTime()){
                    return true;
                }
            }else{
                // periodic execution
                let totalTimeValues = timer.getTotalTimeValues();
                let totalTimeValuePrecision = totalTimeValues[this.precision];
                totalTimeValuePrecision -= this._lastTotalTimeValues ? this._lastTotalTimeValues[this.precision] : 0;
                if(
                    this._config.interval === 1 ||
                    totalTimeValuePrecision % this._config.interval === 0
                ){
                    return true;
                }
            }
            return false;
        }

        invoke(timer){
            if(
                this.isDue(timer) &&
                (!this.isRunning() || this._config.isParallel)
            ){
                this.run(timer);
            }
        }

        run(timer){
            this._lastTotalTimeValues = Object.assign({}, timer.getTotalTimeValues());
            let runId = 'run_' + (++this._runCount);
            let runExec = resolve => {
                resolve(this.task(timer, this));
            };

            let myProm = this._config.timeout > 0 ? new TimeoutPromise(runExec, this._config.timeout) : new Promise(runExec);
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

                // remove this task from store after run
                if(this._config.dueDate instanceof Date){
                    this.delete();
                }
            });

            this._runQueue.set(runId, myProm);
        }
    };

    Task.defaultConfig = {
        precision: 'seconds',   // updateEvent this tasked will be subscribed to
        isParallel: false,      // if true this task can run parallel, e.g. if prev execution has not finished
        interval: 1,            // relates to 'precision'. 'interval' = 3 and 'precision' = "seconds" -> run every 3 seconds
        dueDate: undefined,     // if Date() instance is set, task only runs once at dueDate
        timeout: 50             // if > 0, execution time that exceeds timeout (ms) throw error
    };


    /**
     * An instance of CronManager() handles multiple Task()´s
     * -> Task()´s can be set()/delete() from CronManager() instance
     * @type {CronManager}
     */
    let CronManager = class CronManager {

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

        new(name, config){
            return new Task(name, config);
        }

        set(task){
            if(task instanceof Task){
                // check for unique task name, or update existing task
                if(!this.has(task.name) || (this.get(task.name) === task)){
                    // set new or update existing task
                    task.setManager(this);
                    this._tasks.set(task.name, task);
                    this.debug('SET/UPDATE task: %o config: %o', task.name, task);
                    // start timer (if it is not already running)
                    this.auto();
                }else{
                    console.warn('FAILED to set task. Task name %o already exists', task.name);
                }
            }else{
                throw new TypeError('Parameter must be instance of Task');
            }
        }

        setNew(name, config){
            this.set(this.new(name, config));
        }

        get(name){
            return this._tasks.get(name);
        }

        has(name){
            return this._tasks.has(name);
        }

        delete(name){
            let isDeleted = this._tasks.delete(name);
            if(isDeleted){
                this.debug('DELETE task: %o', name);
                this.auto();
            }
            return isDeleted;
        }

        clear(){
            this.debug('CLEAR all  %o task(s)', this._tasks.size);
            this._tasks.clear();
            this.auto();
        }

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