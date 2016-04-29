var io = {
    ready: true,
    TRANSPORT_LIMIT: 100,   //number of chars a single delivery can handle
    open: function(ioreq) {
        //get fp for given filename
        //resolve path
        var path = ioreq.data;
        if (path[0] !== "/") {
            if (ioreq.pcb.workingdir === "/") {
                path = ioreq.pcb.workingdir + path;
            } else {
                path = ioreq.pcb.workingdir + "/" + path;
            }
        }
        ioreq.fp = fs.getFilePointer(path);
        switch(ioreq.mode) {
            case "r":
            case "r+":
                //ioreq.fp is undefined if file does not exist
                break;
            case "w":
            case "w+":
                if (ioreq.fp !== undefined) {
                    //file exists, delete it
                    fs.remove(ioreq.data);
                }
                //create new empty file
                fs.put(ioreq.data, "");
                ioreq.fp = fs.getFilePointer(ioreq.data);
                break;
            case "a":
            case "a+":
                if (ioreq.fp === undefined) {
                    //file does not exist, create new file
                    fs.put(ioreq.data, "");
                }
                //set fp to end of file
                ioreq.fp = fs.getFilePointer(ioreq.data);
                ioreq.fp.index = ioreq.fp.fileObject.data.length;
                break;
            default:
                //bad arg
                break;
        }
        ioreq.done = true;
        io.ready = true;
    },
    read: function(ioreq) {
        var cbuf = new Array();
        var i;
        if (ioreq.size > io.TRANSPORT_LIMIT) {
            for (i = 0; i < io.TRANSPORT_LIMIT; i++) {
                cbuf[i] = fs.getFileData(ioreq.fp);
                ioreq.fp.index = ioreq.fp.index + 1;    //incr fp
                if(ioreq.fp.eof) {
                    //end reading, return data
                    ioreq.done = true;
                    break;
                }
            }
        } else {
            for (i = 0; i < ioreq.size; i++) {
                cbuf[i] = fs.getFileData(ioreq.fp);
                ioreq.fp.index = ioreq.fp.index + 1;    //incr fp
                if(ioreq.fp.eof) {
                    break;
                }
            }
            ioreq.done = true;
        }
        if(ioreq.data === undefined) ioreq.data = "";
        ioreq.data = ioreq.data + cbuf.join("");
        ioreq.size = ioreq.size - i;
        io.ready = true;
    }, 
    write: function(ioreq) {
        var i;
        if (ioreq.size > io.TRANSPORT_LIMIT) {
            for (i = 0; i < io.TRANSPORT_LIMIT; i++) {
                fs.setFileData(ioreq.fp, ioreq.data[i]);
                ioreq.fp.index = ioreq.fp.index + 1;    //incr fp
            }
            ioreq.data = ioreq.data.substr(i);  //remove portion already written
            ioreq.size = ioreq.size - i;
        } else {
            for (i = 0; i < ioreq.size; i++) {
                fs.setFileData(ioreq.fp, ioreq.data[i]);
                ioreq.fp.index = ioreq.fp.index + 1;    //incr fp
            }
            ioreq.done = true;
        }
        io.ready = true;
    },
    getline: function(ioreq) {
        var cbuf = new Array();
        var i;
        for (i = 0; i < io.TRANSPORT_LIMIT; i++) {
            cbuf[i] = fs.getFileData(ioreq.fp);
            ioreq.fp.index = ioreq.fp.index + 1;    //incr fp
            if(i === ioreq.size - 1||
                    cbuf[i] === '\n' || ioreq.fp.eof) {
                //reading finished, return data
                ioreq.done = true;
                break;
            }
        }
        if (i === io.TRANSPORT_LIMIT && ioreq.done === false) {
            ioreq.size = ioreq.size - i;    //read is not finished
        }
        //append received data into the IORequest
        if(ioreq.data === undefined) ioreq.data = "";
        ioreq.data = ioreq.data + cbuf.join("");
        io.ready = true;
    },
    list: function(ioreq){
        var path = ioreq.data;
        var dir = fs.getFile(path);
        ioreq.data = new Array();
        if (dir !== undefined) {
            if (dir.meta[0] === "d") {
                for(var file in dir.data){
                    ioreq.data.push(file);
                }
            } else {
                ioreq.data.push(path);
            }
        }
        ioreq.done = true;
        io.ready = true;
    },
    
    remove: function(ioreq) {
        fs.remove(ioreq.data);
        ioreq.done = true;
        io.ready = true;
    },
    mkdir: function(ioreq) {
        fs.mkdir(ioreq.data);
        ioreq.done = true;
        io.ready = true;
    },
    rmdir: function(ioreq) {
        fs.rmdir(ioreq.data);
        ioreq.done = true;
        io.ready = true;
    },
};

//setTimeout(function, time-ms) after the time in millisec pass the function will trigger
function iodriver(ioreq) {
    io.ready = false;
    var delay = Math.random()*10;
    switch(ioreq.task) {
        case "open":
            setTimeout(function(){io.open(ioreq);}, delay);
            break;
        case "read":
            setTimeout(function(){io.read(ioreq);}, delay);
            break;
        case "write":
            setTimeout(function(){io.write(ioreq);}, delay);
            break;
        case "close":
            setTimeout(function(){io.close(ioreq);}, delay);
            break;
        case "getline":
            setTimeout(function(){io.getline(ioreq);}, delay);
            break;
        case "list":
            setTimeout(function(){io.list(ioreq);}, delay);
            break;
        case "remove":
            setTimeout(function(){io.remove(ioreq);}, delay);
            break;
        case "mkdir":
            setTimeout(function(){io.mkdir(ioreq);}, delay);
            break;
        case "rmdir":
            setTimeout(function(){io.rmdir(ioreq);}, delay);
            break;
        case "remove":
            setTimeout(function(){io.remove(ioreq);}, delay);
            break;
    }
}
