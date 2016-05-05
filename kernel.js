//process queue
var pq = new Queue();

//io request queue
var fq = new Queue();

//associative array of mutexes - string name : mutex object
var mutexList = {};

//associative array of semaphores - string name : semaphore object
var semList = {};

//create new process
var programCounter = 0;
function load(program, name) {
    var pcb = new PCB(program, name, "start", programCounter, undefined);
    pq.push_back(pcb.thread);
    console.log("start " + programCounter + " " + name);
    console.log(pq.tail.object.program);
    programCounter++;
};

//I/O request object
function IORequest(task, pcb) {
    this.task = task;
    this.pcb = pcb;     //ref of requesting process
    this.varId;         //string identifier of variable to be set
    this.fp;            //FilePointer object
    this.data;
    this.size;          //int number of chars to read/write
    this.mode;          //string file access mode
    this.done = false;  //boolean has this request been responded to?
};

//return data to I/O requester
function ioreturn(ioreq) {
    //update variable assignment
    switch(ioreq.task) {
        case "open":
            //set _var with FilePointer
            ioreq.pcb.set(ioreq.varId, ioreq.fp);
            //add file to this process's list of open files
            ioreq.pcb.fileList.push(new FileStruct(ioreq.fp, ioreq.mode));
            break;
        case "read":
        case "getline":
        case "list":
            ioreq.pcb.set(ioreq.varId, ioreq.data);
            break;
        case "write":
            break;
        case "close":
            break;
        case "remove":
            break;
        case "mkdir":
        case "rmdir":
            break;
        default:
            console.log("IO Return Error");
    }
    ioreq.pcb.state = "ready";   
}

//====EXEC COMMANDS============================================
// some definitions for our own sanity
// _var : a string in user programs, but interpreted as a variable identifier

//  [open, [_var filename, string flags, _var filepointer]]
// Opens a file with the name set in _var filename with given permission flags
// and sets filepointer
function open(pcb, argv){
    var ioreq = new IORequest("open", pcb);
    var path = pcb.get(argv[0]);     //_var filename
    ioreq.data = resolvePath(path, pcb.workingdir);
    ioreq.mode = argv[1];   //string file access mode
    ioreq.varId = argv[2];  //_var identifier to be set with fp
    fq.push_back(ioreq);
    console.log(pcb.toString() + " running to waiting for open");
    pcb.state = "waiting";
}

//  [close, [_var filepointer]]
// Closes file corresponding to filepointer
function close(pcb, argv){
    //remove file from this process's list of open files
    var fp = pcb.get(argv[0]);
    for (var i = 0; i < pcb.fileList.length; i++) {
        if (pcb.fileList[i].filepointer === fp) {
            pcb.fileList.splice(i, 1);
            break;
        }
    }
}

//  [remove, [_var filename]]
// Removes file from filesystem
function remove(pcb, argv) {
    var ioreq = new IORequest("remove", pcb);
    var path = pcb.get(argv[0]);     //_var filename
    ioreq.data = resolve(path, pcb.workingdir);
    fq.push_back(ioreq);
}

//  [read, [_var filepointer, _var stringBuffer, int size]]
// Sets buffer with size number of characters starting at where filepointer is
// at. Increments filepointer to one past the last read character.
function read(pcb, argv){
    var fp = pcb.get(argv[0]);
    var mode;
    for (var i = 0; i < pcb.fileList.length; i++) {
        if (pcb.fileList[i].filepointer === fp) {
            mode = pcb.fileList[i].mode;
            break;
        }
    }
    if (mode[0] !== "r" && mode[1] !== "+") {
        console.log("read permission error");
        return 1;
    }
    var ioreq = new IORequest("read", pcb);
    ioreq.fp = pcb.get(argv[0]);    //_var filepointer
    ioreq.varId = argv[1];          //_var identifier to be set with string
    ioreq.size = argv[2];           //int size
    fq.push_back(ioreq);
    console.log(pcb.toString() + " running to waiting for read");
    pcb.state = "waiting";
}

//  [write, [_var filepointer, _var stringBuffer]]
// Writes buffer to where filepointer is at. If fp is not at the end of the file,
// this will replace any existing data at that position. Increments filepointer
// to one past the last written character.
function write(pcb, argv){
    var fp = pcb.get(argv[0]);
    var mode;
    for (var i = 0; i < pcb.fileList.length; i++) {
        if (pcb.fileList[i].filepointer === fp) {
            mode = pcb.fileList[i].mode;
            break;
        }
    }
    if (mode === "r") {
        console.log("write permission error");
        return 1;
    }
    var ioreq = new IORequest("write", pcb);
    ioreq.fp = pcb.get(argv[0]);            //_var filepointer
    ioreq.data = pcb.get(argv[1]);          //_var stringBuffer
    ioreq.size = pcb.get(argv[1]).length;   //int size
    fq.push_back(ioreq);
    console.log(pcb.toString() + " running to waiting for write");
    pcb.state = "waiting";
}

//  [getline, [_var stringBuffer, int size, _var filepointer]]
// Reads from file into buffer until a newline is found or size number of
// characters are read. Newline is included in buffer if one was found.
function getline(pcb, argv) {
    var fp = pcb.get(argv[2]);
    var mode;
    for (var i = 0; i < pcb.fileList.length; i++) {
        if (pcb.fileList[i].filepointer === fp) {
            mode = pcb.fileList[i].mode;
            break;
        }
    }
    if (mode[0] !== "r" && mode[1] !== "+") {
        console.log("read permission error");
        return 1;
    }
    var ioreq = new IORequest("getline", pcb);
    ioreq.varId = argv[0];          //_var identifier to be set with string
    ioreq.size = argv[1];           //int size
    ioreq.fp = pcb.get(argv[2]);    //_var filepointer
    fq.push_back(ioreq);
    console.log(pcb.toString() + " running to waiting for getline");
    pcb.state = "waiting";
}

//  [mkdir, [_var dirName]]
// Makes a new directory
function mkdir(pcb, argv) {
    var ioreq = new IORequest("mkdir", pcb);
    var path = pcb.get(argv[0]);     //_var dirName
    ioreq.data = resolvePath(path, pcb.workingdir);
    fq.push_back(ioreq);
    console.log(pcb.toString() + " running to waiting for mkdir");
    pcb.state = "waiting";
}

//  [rmdir, [_var dirName]]
// Removes directory (must be empty)
function rmdir(pcb, argv) {
    var ioreq = new IORequest("rmdir", pcb);
    var path = pcb.get(argv[0]);     //_var dirName
    ioreq.data = resolvePath(path, pcb.workingdir);
    fq.push_back(ioreq);
}

//  [readdir, [_var dirName, _var stringArray]
function readdir(pcb, argv) {
    var ioreq = new IORequest("list", pcb);
    var path = pcb.get(argv[0]);     //_var dirName
    ioreq.data = resolvePath(path, pcb.workingdir);
    ioreq.varId = argv[1];
    fq.push_back(ioreq);
    console.log(pcb.toString() + " running to waiting for readdir");
    pcb.state = "waiting";
}

//  [chdir, [_var path]]
// Changes the current working directory of the calling process to the
// directory specified in path
function chdir(pcb, argv) {
    var path = pcb.get(argv[0]);     //_var dirName
    path = resolvePath(path, pcb.workingdir);
    var dir = fs.getFile(path);
    if (dir !== undefined && dir.meta[0] === "d") {
        pcb.workingdir = path;
    }
}

function set(pcb, argv){
    pcb.set(argv[0], argv[1]);
}

function add(pcb, argv){
    pcb.set(argv[0],
            pcb.get[argv[1]] +
            pcb.get[argv[2]]);
}

//  [createChildProcess, [_var argv]]
// Creates child process, executing the program with filename given in _var
// argv[0]. All argument argv are passed to the new process.
function createChildProcess(pcb, argv) {
    argv = pcb.get(argv);
    var path = argv[0];
    path = resolvePath(path, pcb.workingdir);
    var program = fs.getFile(path);
    if (program === undefined) {
        return;
    }
    
    var child = pcb.createChild(
            program.data,
            argv[0].split("/").pop(),
            "start",
            programCounter++,
            argv);
    pq.push_back(child.thread);
    console.log("start " + child.toString());
}

/* Threading */
//  [pthread_create, [_var threadName, code, _var argv]]
// creates child thread of calling thread
function pthread_create(pcb, argv) {
    var thread = new Thread(pcb.pcb, pcb, "start", pcb.pcb.nexttid, argv[1], argv[2]);
    pcb.pcb.nexttid = pcb.pcb.nexttid + 1;  //increment id
    pq.push_back(thread);
    pcb.set(argv[0], thread);
    console.log("start " + thread.toString());
}

function pthread_join(pcb, argv) {
    
}

//  [pthread_exit, []]
// terminates calling thread
function pthread_exit(pcb, argv) {
    pcb.stop();
    console.log(pcb.toString() + " stopping");
}

/* Mutex */
//  [pthread_mutex_init, [string name]]
// Creates mutex with given name
function pthread_mutex_init(pcb, argv) {
    if (!(argv[0] in mutexList)) {
        mutexList[argv[0]] = new Mutex();
    }
}

//  [pthread_mutex_lock, [string name]]
// Attempts to lock mutex, and blocks until acquired
function pthread_mutex_lock(pcb, argv) {
    if (!(argv[0] in mutexList)) {
        mutexList[argv[0]] = new Mutex();
    }
    var mutex = mutexList[argv[0]];
    if (mutex.locked) {
        mutex.waitList.push_back(pcb);
        pcb.state = "waiting";
        console.log(pcb.toString() + " to wait for mutex " + argv[0]);
    } else {
        mutex.locked = true;
        mutex.owner = pcb;
    }
}

//  [pthread_mutex_trylock, [string name]]
// Attempts to lock mutex and returns immediately if already locked
function pthread_mutex_trylock(pcb, argv) {
    if (!(argv[0] in mutexList)) {
        mutexList[argv[0]] = new Mutex();
    }
    var mutex = mutexList[argv[0]];
    if (!mutex.locked) {
        mutex.locked = true;
        mutex.owner = pcb;
    }
}

//  [pthread_mutex_unlock, [string name]]
// Unlocks mutex. Also signals for next waiting thread to acquire lock.
function pthread_mutex_unlock(pcb, argv) {
    //check
    if (!(argv[0] in mutexList)) {
        return;
    }
    var mutex = mutexList[argv[0]];
    if (mutex.owner === pcb) {
        mutex.owner = undefined;
        mutex.locked = false;
        //let next thread acquire mutex
        if (!mutex.waitList.isEmpty()) {
            mutex.owner = mutex.waitList.pop_front();
            mutex.locked = true;
            mutex.owner.state = "ready";
            console.log(mutex.owner.toString() + " acquired lock on mutex " + argv[0]);
        }
    }
}

/* Semaphores */
//  [sem_init, [string name, int value]
// Creates new named semaphore with initial value value
function sem_init(pcb, argv) {
    if (!(argv[0] in semList)) {
        semList[argv[0]] = new Semaphore(argv[1]);
    }
}

function sem_wait(pcb, argv) {
    
}

function sem_post(pcb, argv) {
    
}

//=============================================================
//execute process instruction
function exec(pcb) {
    console.log(pcb.toString() + " "+pcb.state+" to running");
    pcb.state = "running";
    while(pcb.state === "running") {
        var line = pcb.program[pcb.pc];
        //line[0] must be a function object && line[1] is the array of arguments for function
        line[0](pcb, line[1]);
        //increment pc
        pcb.pc = pcb.pc + 1; 
        //end of process file then will delete
        if(pcb.pc >= pcb.program.length) {
            console.log(pcb.toString() + "stopping");
            pcb.stop();
        }
    }
};

//main kernel loop
function kernel() {
    //execute instructions of ready process
    if(!pq.isEmpty() && pq.front().state === "ready" || pq.front().state === "start") {
        exec(pq.front());
    }
    //move process to end of queue
    if(!pq.isEmpty() && pq.front().state === "stop") {
        console.log("finished "+ pq.front().pid );
        pq.pop_front();
    } else {
        pq.push_back(pq.pop_front());
    }
    //unload finished processes
    while(!pq.isEmpty() && pq.front().state === "stop") {
        console.log("finished "+ pq.front().pid );
        pq.pop_front();
    }
    //run io driver
    while(io.ready && !fq.isEmpty() && !fq.front().done) {
        iodriver(fq.front());
    }
    //return finished io requests
    while(!fq.isEmpty() && fq.front().done) {
        //return data to requesting process & remove io request
        ioreturn(fq.pop_front());
    }
    setTimeout(function(){kernel();}, 0);
};
