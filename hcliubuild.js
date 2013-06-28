var url = require('url');
var http = require('http');
var fs = require('fs');
var child_process = require('child_process');
var crypto = require('crypto');
var readline = require('readline');

var appVer = '1.0';
var jsCompiler = '';
var cssCompiler = '';
var tempFolder = '_tmp';
var logFile = 'build.log';
var confFile = 'build.conf';
var settingFile = 'setting.conf';
var conf = {};
var setting = {};
var ver = {};
var verFile = 'ver.conf';
var clearOldFile = true;
var useLock = false;
var lastver="";
var errCount = 0;

function diffItem(m,dt){
    this.isMatch=m;
    this.data=dt;
}
var log = function (str) {
	console.log(str);
	fs.appendFileSync(logFile, str + '\r\n');
};

var err = function (str) {
	log('[error]: ' + str);
	pause();
}

var pause = function () {
	var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
	});
	setTimeout(function () {
		rl.question('\n================================================================\nSOMTHING IS ERROR !!! check the logs and press any key to exit!\n================================================================\n', function () {
			process.exit();
		});
	}, 1500);
};

var oldFileChecksum = function (file,chunkSize) {
	var txt = fs.readFileSync(file, {
		encoding: 'utf-8'
	});
    var checksumArray={};
    var currentIndex=0;
    var len=txt.length;
    var chunkNo=0;
	while(currentIndex<len) {
       var chunk=txt.substr(currentIndex,chunkSize);
       var chunkMd5=getMd5ByText(chunk);
        checksumArray[chunkMd5]=chunkNo;
       currentIndex=currentIndex+chunkSize;
       chunkNo++;
	}
    return checksumArray;
};

var getMd5ByText = function (s) {
	var md5sum = crypto.createHash('md5');
	md5sum.update(s);
	return md5sum.digest('hex');
};
var checkMatchIndex=function(chunkMd5,checksumArray){
  var chunkNo=checksumArray[chunkMd5];
   if(typeof(chunkNo)==undefined){
       return -1;
   }
   else{
       return chunkNo;
   }
}
var doExactNewData=function( incDataArray,data){
    	var di = new diffItem(false,data);
    	incDataArray.push(di);
 }
var doExactMatch=function( incDataArray,chunkNo) {
		// 写块匹配
		var di = new diffItem(true,chunkNo);
		incDataArray.push(di);
}
var searchChunk=function(newFile,checksumArray,chunkSize){
    var incDataArray=new Array();
    //chunk
	var buffer=null;
	 //用于缓存两个匹配块之间的新增数据
	var outBuffer ="";
	// 指向块后的第一个字符
	var currentIndex = 0;
  	var strInput = fs.readFileSync(newFile, {
		encoding: 'utf-8'
	});
    var tLen=strInput.length;
    	while(currentIndex<=tLen){
			var endIndex=currentIndex+chunkSize;
			if(endIndex>tLen){
				endIndex=tLen;
			}
			buffer=strInput.substring(currentIndex,endIndex);
	        var chunkMd5=getMd5ByText(buffer);
			var matchTrunkIndex=checkMatchIndex(chunkMd5,checksumArray);
			//若果是最后一个
			if(endIndex>tLen-1){
				//先把新块压入队列
				if(outBuffer.length>0&&!outBuffer==""){
					doExactNewData(incDataArray,outBuffer);
					outBuffer="";
				}
				if(buffer.length>0&&!buffer==""){
					doExactNewData(incDataArray,buffer);
				}
				currentIndex=currentIndex+chunkSize;
			}
			//如果找到匹配块
			else if(matchTrunkIndex>=0){
				//先把新块压入队列
				if(outBuffer.length>0&&!outBuffer==""){
					doExactNewData(incDataArray,outBuffer);
					outBuffer="";
				}
				doExactMatch(incDataArray, matchTrunkIndex);
				currentIndex=currentIndex+chunkSize;

			}
			else{
				outBuffer=outBuffer+strInput.substring(currentIndex,currentIndex+1);
				currentIndex++;
			}

		}
    return incDataArray;
};
var getFileInfo = function (path){
	var pathArr = path.split('/');
	var name = pathArr.pop();
	var namearr = name.split('.');
	var extName = namearr.pop();
	var fileName = namearr.join('.');
	var filePath = pathArr.join('/');
    var verArr=fileName.split('-');
    var ver=verArr.pop();
	return {
		filePath: filePath || '.',
		fileName: fileName,
		extName: extName,
        ver:ver,
		fullName: fileName + '.' + extName
	};
};
var makeIncDataFile=function(oldFile,newFile,chunkSize){
   
    var resultFile={};
    var oInfo=getFileInfo(oldFile);
    var nInfo=getFileInfo(newFile);
    var incFile=oInfo.filePath+"/"+oInfo.fileName.replace(oInfo.ver,oInfo.ver+"_"+nInfo.ver)+"."+oInfo.extName;
    resultFile.file=incFile.replace("./release/","");
    resultFile.chunkSize=chunkSize;
  //  var oldChecksum=oldFileChecksum("F:/nginx-1.5.1/html/client-1000.js");

   // var diffArray=searchChunk("F:/nginx-1.5.1/html/server.js",oldChecksum);
    var oldChecksum=oldFileChecksum(oldFile,chunkSize);
    var diffArray=searchChunk(newFile,oldChecksum,chunkSize);
    var arrayData ="";
   // var newData="";
	var lastitem=null;
    var matchCount=0;
    var size=diffArray.length;
    var strDataArray=new Array();
    for(var i=0;i<size;i++){
        var item=diffArray[i];
        	if (item.isMatch) {
				//如果第一个匹配，
				if(lastitem==null||!lastitem.isMatch){
                    arrayData="["+item.data+",";
					matchCount=1;
				}
				else if(lastitem.isMatch&&lastitem.data+1==item.data){
					matchCount++;
				}
				else if(lastitem.isMatch&&lastitem.data+1>item.data){
                    arrayData+=matchCount+"]";
                    strDataArray.push(JSON.parse(arrayData));
                    arrayData="["+item.data+","
					matchCount=1;
				}
				 if(i==(size-1)){
                      arrayData+=matchCount+"]";
                      strDataArray.push(JSON.parse(arrayData));
                      arrayData="";
				}
			} else {
				if(matchCount>0){
					arrayData+=matchCount+"]";
                    console.log(arrayData);
                    strDataArray.push(JSON.parse(arrayData));
                    arrayData="";
					matchCount=0;
				}
				//&quot;
				var data=item.data;
				//data=data.replace(/"/g, "&jsquot&&&;");
                strDataArray.push(data);
				//strData+="\"" +data +"\",";
			}
			lastitem=item;
    }
   // strData=strData.substr(0,strData.length-1);
  //  strData+="]";
   // console.log("xxxsadfadfa"+strData);
     resultFile.data=strDataArray;
    return resultFile;
}
var log = function (str) {
	console.log(str);
	fs.appendFileSync(logFile, str + '\r\n');
};

var err = function (str) {
	errCount ++;
	log('[error]: ' + str);
	pause();
}

var clearLog = function () {
	fs.appendFileSync(logFile, '', {flag:'w'});
};

var pause = function () {
	var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
	});
	setTimeout(function () {
		rl.question('\n================================================================\nSOMTHING IS ERROR !!! check the logs and press any key to exit!\n================================================================\n', function () {
			process.exit();
		});
	}, 1500);
};

var toJson = function (str) {
	return new Function('return (' + str +')')();
};

var readConf = function (file) {
	var txt = fs.readFileSync(file, {
		encoding: 'utf8'
	});
	if (!txt) {
		txt = '{}';
	}
	return toJson(txt);
};

//var getFileInfo = function (path){
//	var pathArr = path.split('/');
//	var name = pathArr.pop();
//	var namearr = name.split('.');
//	var extName = namearr.pop();
//	var fileName = namearr.join('.');
//	var filePath = pathArr.join('/');
//	return {
//		filePath: filePath || '.',
//		fileName: fileName,
//		extName: extName,
//		fullName: fileName + '.' + extName
//	};
//};

var getMd5 = function (path) {
	var s = fs.readFileSync(path);
	var md5sum = crypto.createHash('md5');
	md5sum.update(s);
	return md5sum.digest('hex');
};

var getVer = function () {
	return ver.ver;
};

var fixZero = function (n, l) {
	var i = 0;
	var z = '';
	l = Math.max(('' + n).length, l);
	for (i=0; i<l; i++) {
		z += '0';
	}
	z += n;
	return z.slice(-1*l);
}

var updateVer = function () {
	var v = ver.ver;
	var per = fixZero(parseInt(ver.personalFlag || '0'), 2);
	var now = new Date();
	var year = now.getFullYear();
	var month = now.getMonth() + 1;
	var day = now.getDate();
	var today = now.getFullYear() + fixZero(month, 2) + fixZero(day, 2);
	var vDate,vCount,newVer;
	var s;
	if (!v) {
		v = today + per + '001';
	}
	vDate = v.slice(0, 8);
	vCount = parseInt(v.slice(-3));
	if (vDate != today) {
		vCount = 0;
	}
	vCount = fixZero(++vCount, 3);
	newVer = today + per + vCount;
	ver.ver = newVer;
	log('current Version: ' + newVer);
	s = fs.readFileSync(verFile, {encoding: 'utf8'});
	s = s.replace(/[\"\']?ver[\"\']?:\s*[\"\']?\d*[\"\']?/,'ver: \'' + newVer + '\'');
	fs.writeFileSync(verFile, s);
}


var downloadFile = function (fileUrl, cb) {
	var fileUrlObj = url.parse(fileUrl);
	var opts = {
		host: fileUrlObj.host,
		port: fileUrlObj.port || 80,
		path: fileUrlObj.pathname
	};
	var fileInfo = getFileInfo(fileUrlObj.pathname);
	var req = http.get(fileUrl, function(res) {
		res.on('data', function (chunk) {
			var tmp = tempFolder + '/' + fileInfo.fileName + '_' + new Date().getTime() + '.' + fileInfo.extName;
			fs.writeFileSync(tmp, chunk);
			cb && cb(tmp);
		});
	});
	req.on('error', function(e) {
		err('problem with request: ' + e.message);
	});
};

var copyFile = function (filePath, cb) {
	var s = fs.readFileSync(filePath);
	var fileInfo = getFileInfo(filePath);
	var tmp = tempFolder + '/' + fileInfo.fileName + '_' + new Date().getTime() + '.' + fileInfo.extName;
	fs.appendFileSync(tmp, s);
	cb && cb(tmp);
};

var combineFiles = function (target, files, cb) {
	var newFiles = [];
	var len = files.length;
	var targetInfo = getFileInfo(target);
	var processNextFile = function (f) {
		var file = files.shift();
		if (f) {
			newFiles.push(f);
		}
		if (!file) {
			return;
		}
		if (/^http:\/\//.test(file)) {
			log('download ' + file);
			downloadFile(file, processNextFile);
		}else {
			log('copy ' + file);
			copyFile(file, processNextFile);
		}
	};
	var checkLen = function () {
		var s = '';
		var tmp = '';
		var targetFileInfo;
		var fileList;
		var reg;
		var realTarget
		if (newFiles.length == len) {
			newFiles.forEach(function (itm) {
				s += fs.readFileSync(itm);
			});
			tmp = tempFolder + '/' + targetInfo.fileName + '_' + new Date().getTime() + '.' + targetInfo.extName;
			fs.writeFileSync(tmp, s);
			realTarget = target;
			if (/{ver}/.test(target)) {
				realTarget = target.replace('{ver}', getVer());
			}
			if (/{md5}/.test(target)) {
				realTarget = target.replace('{md5}', getMd5(tmp));
			}
			if (clearOldFile) {
				targetFileInfo = getFileInfo(realTarget);
				fileList = fs.readdirSync(targetFileInfo.filePath);
				fileList.forEach(function (itm) {
					reg = new RegExp(target.replace('{ver}','\\d{13}').replace('{md5}', '[a-z\\d]{32}'));
					if (reg.test(targetFileInfo.filePath + '/' + itm)){
						log('delete file ' + targetFileInfo.filePath + '/' + itm);
						fs.unlinkSync(targetFileInfo.filePath + '/' + itm);
					}
				});
			}
			cb && cb(tmp,  realTarget);
		}else {
			setTimeout(checkLen, 100);
		}
	};
	processNextFile();
	checkLen();
};

var buildJs = function (target, files, cb) {
	combineFiles(target, files, function (tmp, targetPath) {
		var cmd = '';
		cmd = 'java -jar ' + jsCompiler + ' --charset utf8 --language_in ECMASCRIPT5 --compilation_level SIMPLE_OPTIMIZATIONS  --js ' + tmp + ' --js_output_file ' + targetPath;
		log(cmd);
		child_process.exec(cmd,   function (error, stdout, stderr) {
			if (error !== null) {
				err('exec error ' + error);
			}
			cb && cb(getFileInfo(targetPath).fullName);
		});
	});
};


var buildCss = function (target, files, cb) {
	combineFiles(target, files, function (tmp, targetPath) {
		var cmd = '';
		cmd = 'java -jar ' + cssCompiler + ' --type css --charset utf-8 -o ' + targetPath + ' ' + tmp;
		log(cmd);
		child_process.exec(cmd,   function (error, stdout, stderr) {
			if (error !== null) {
			  err('exec error: ' + error);
			}
			cb && cb(getFileInfo(targetPath).fullName);
		});
	});
};

//替换版本
var replaceFile = function (replacements, releasedFile) {
	//var s = '',reg;
	//([].concat(replacements)).forEach(function (itm) {
	//	s = fs.readFileSync(itm.file,{encoding: itm.encoding || 'utf8'});
		//reg = new RegExp(itm.target || '', 'g');
		//if (reg.test(s)){
			//s = s.replace(lastver, ver.ver);
			//fs.writeFileSync(itm.file,s,{encoding: itm.encoding || 'utf8'});
		//}else{
		//	log('regexp not match in the file ' + itm.file + ' \'' + itm.target + '\'')
		//}
	//});
};
var buildIncFile=function(releasedFile,chunkSize){
    //如有有老版本
    var oldFile="./release/"+releasedFile.replace(ver.ver,lastver);
    fs.exists(oldFile, function(exists) {
        if (exists) {
            
            var resultFile=makeIncDataFile(oldFile,"./release/"+releasedFile,chunkSize);
            var incFileName="./release/"+releasedFile.replace(ver.ver,lastver+"_"+ver.ver);
            console.log(resultFile);
            fs.writeFileSync(incFileName,  JSON.stringify(resultFile));
        }
    });
}

var build = function (target, files, replacements,chunkSize) {
	log('build ' + target);
	if (!target) {
		err('target file is empty!');
		return;
	}
	if ((!files) || (files.length == 0)) {
		err('source file can not be empty! (' + target + ')');
		return;
	}
	if (!replacements) {
		replacements = [];
	}
	if (/\.js$/.test(target)) {
		buildJs(target, files, function (releasedFile) {
			replaceFile(replacements, releasedFile);
           if(typeof(chunkSize)!="undefined"&&chunkSize>0){
                //建增量文件
                buildIncFile(releasedFile,chunkSize);
           }
		});
		return;
	}
	if (/\.css$/.test(target)) {
		buildCss(target, files, function (releasedFile) {
			replaceFile(replacements, releasedFile);
           if(typeof(chunkSize)!="undefined"&&chunkSize>0){
                //建增量文件
                buildIncFile(releasedFile,chunkSize);
           }
		});
		return;
	}
	err('error: file type must be "js" or "css"!');
};

var fetchConf = function (conf) {
	var k;
	for(k in conf) {
		if (conf.hasOwnProperty(k)) {
			build(k, (conf[k] || {}).files, (conf[k] || {}).replace,(conf[k] || {}).chunkSize);
		}
	}
};

var init = function () {
	var dirList;
	settingFile = process.argv[1].replace(/[^\\]*$/, 'setting.conf');
	verFile = process.argv[3] || 'ver.conf';
	confFile = process.argv[2] || 'build.conf';
	conf = readConf(confFile);
	setting = readConf(settingFile);
	ver = readConf(verFile);
    //用一个变量保存上次的版本
    lastver=ver.ver;
	clearLog();
	clearOldFile =false;
	updateVer();
	if (setting.temp) {
		tempFolder = setting.temp;
	}
	tempFolder = process.argv[1].replace(/[^\\]*$/, tempFolder);
	if (fs.existsSync(tempFolder)) {
		dirList = fs.readdirSync(tempFolder);
		dirList.forEach(function(item){
			fs.unlinkSync(tempFolder + '/' + item)
		});
	}else {
		fs.mkdirSync(tempFolder);
	}
	jsCompiler = process.argv[1].replace(/[^\\]*$/,setting.jsCompiler);
	cssCompiler = process.argv[1].replace(/[^\\]*$/,setting.cssCompiler);
	fetchConf(conf);
};

(function () {
	process.on('exit', function () {
		if (useLock) {
			fs.unlinkSync(process.argv[1].replace(/[^\\]*$/,'lock'));
		}
	});
	// 检查锁
	if (fs.existsSync(process.argv[1].replace(/[^\\]*$/,'lock'))){
		console.log('another build task is runing, try later ~\n');
		pause();
	}else {
		fs.appendFileSync(process.argv[1].replace(/[^\\]*$/,'lock'),'');
		useLock = true;
	}
})();

//try {
	init();
//}catch(e){
//	err(e.message);
//}
//var resultFile=makeIncDataFile("F:/nginx-1.5.1/html/client-1000.js","F:/nginx-1.5.1/html/client-2000.js",20);
//log(resultFile);















