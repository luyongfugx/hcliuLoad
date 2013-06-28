var hcliuLoad = (function(){
 //用evel执行js,在从本地存储读取js的时候使用
 var globalEval=function (data) {
    if (data && /\S/.test(data)) {
      (window.execScript || function(data) {
        window['eval'].call(window, data)
      })(data)
    }
  };
 //使用css文本生成css
 var createCss=function(cssStr){
	var style = document.createElement('style');
	style.setAttribute('type', 'text/css');
	style.appendChild(document.createTextNode(cssStr));
  };
 var xhr=function (url, callback) {
    var r = window.ActiveXObject ? new window.ActiveXObject('Microsoft.XMLHTTP') : new window.XMLHttpRequest();
    r.open('GET', url, false);
    r.onreadystatechange = function() {
      if (r.readyState === 4) {
        if (r.status === 200) {
            callback(r.responseText)
        }
        else {
            throw new Error('Could not load: ' + url + ', status = ' + r.status);
        }
      }
    };
    return r.send(null);
  };
  //获取增量js地址,js地址，上个版本号，本次版本号,xxx.01-03.js
  var getIncUrl=function(jsurl,lastver,ver){

    var ext=getExt(jsurl);
	return jsurl.replace(ext,"-"+lastver+"_"+ver+ext);
  }
  //获取扩展名，可能是css或者js
  var getExt=function (file) {
    var p = file.lastIndexOf('.');
    return p >= 0 ? file.substring(p) : ''
  };
  //rsync解码重新生成js
  var rsyncjs=function(source,trunkSize,checksumcode){
	var strResult="";
	
	for(var i=0;i<checksumcode.length;i++){
		var code=checksumcode[i];
		if(typeof (code)=='string'){
		    //双引号特征码&jsquot&&&;,要替换回来
			strResult+=code;
		}
		else{
			var start=code[0]*trunkSize;
			var end=code[1]*trunkSize;
			var oldcode=source.substr(start,end);
			strResult+=oldcode;
		}
	}
	return strResult;
  }
  var load=function(jsUrlItem,callback){
	//for(var i=0;i<jsArray.length;i++){
        //var jsUrlItem=jsArray[i];
        var incMode=jsUrlItem.inc;
        var jsUrl=jsUrlItem.url;
        var isStore=jsUrlItem.store;
		var urlSplit = jsUrl.split('?');
		var isfromLocal=true;
		//js 地址，jsver 是版本号
		var js=urlSplit[0];
		var jsver=urlSplit[1];
		var ext=getExt(js);
		//如果支持本地存储且是存储到本地存储的模式
        if ('localStorage' in window&&isStore){
			//获取上一个版本
			var lastver= localStorage.getItem(js);
			//如果是第一次加载脚本或者有新版本,则需要从网站上更新
			if(!lastver||(jsver!=lastver)){
				isfromLocal=false;
			}
		}
		else{
			isfromLocal=false;
		}
		
		var jsCode="";
		//如果从本地读取，则读取
		if(isfromLocal){
			
			jsCode=localStorage.getItem(js+"?code");
		}
		else{
		//如果支持本地存储，同步请求静态资源，赋值给jscode,并写入localstorage
	
			if ('localStorage' in window&&isStore){
		
				//获取上一个版本
			    var lastver= localStorage.getItem(js);
                //如果版本号后5位递增1，则可以使用增量模式，否则全部更新
                var incver=parseInt(jsver.substr(jsver.length-3,3));
				var incOldVer=-10;
				if(lastver){
					incOldVer=parseInt(lastver.substr(lastver.length-3,3));
				}
			
                if(incver-incOldVer!=1){
                    incMode=false;
                }
				//如果是增量模式,且有上个版本数据
				if(incMode&&lastver){
						
					jsUrl=getIncUrl(js,lastver,jsver);
				}
				else{
				    
					jsUrl=js.replace(ext,"-"+jsver+ext);
				}

			    xhr(jsUrl,function(data){
					//如果是增量模式,且有上个版本数据
					if(incMode&&lastver){
                        var incData= JSON.parse(data);
					    var checksumcode=incData.data;
					    jsCode=rsyncjs(localStorage.getItem(js+"?code"),incData.chunkSize,checksumcode);
						
					}
					else{
						jsCode=data;
					}
					localStorage.setItem(js, jsver);	
					localStorage.setItem(js+"?code", jsCode);	
					}
				);
			
			}
			else{
			    if(".js"==ext){
				    var READY_STATE_RE = /loaded|complete|undefined/
					var node = document.createElement('script');
					jsUrl=js.replace(ext,"-"+jsver+ext);
					node.setAttribute('src', jsUrl);
					document.head.appendChild(node);
					node.onload = node.onerror = node.onreadystatechange = function() {
						if (READY_STATE_RE.test(node.readyState)) {
							callback();
						}
					};
				}
				else if(".css"==ext){
					var node = document.createElement('link');
					jsUrl=js.replace(ext,"-"+jsver+ext);
					node.setAttribute('rel', 'stylesheet');
					node.setAttribute('type', 'text/css');
					node.setAttribute('src', jsUrl);
					document.head.appendChild(node);
					node.onload = node.onerror = function() {
						callback();
					}
				}
		
			}
	   
	   }
       
	   if ('localStorage' in window&&isStore){
		    if(".js"==ext){
			    globalEval(jsCode);
			}
			else if(".css"==ext){
				createCss(jsCode);
			}
			callback();
	   }
	   
	
  };
 return {
	'load':load
 }

})();