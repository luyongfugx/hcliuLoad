var hcliuLoad = (function(){
 //��evelִ��js,�ڴӱ��ش洢��ȡjs��ʱ��ʹ��
 var globalEval=function (data) {
    if (data && /\S/.test(data)) {
      (window.execScript || function(data) {
        window['eval'].call(window, data)
      })(data)
    }
  };
 //ʹ��css�ı�����css
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
  //��ȡ����js��ַ,js��ַ���ϸ��汾�ţ����ΰ汾��,xxx.01-03.js
  var getIncUrl=function(jsurl,lastver,ver){

    var ext=getExt(jsurl);
	return jsurl.replace(ext,"-"+lastver+"_"+ver+ext);
  }
  //��ȡ��չ����������css����js
  var getExt=function (file) {
    var p = file.lastIndexOf('.');
    return p >= 0 ? file.substring(p) : ''
  };
  //rsync������������js
  var rsyncjs=function(source,trunkSize,checksumcode){
	var strResult="";
	
	for(var i=0;i<checksumcode.length;i++){
		var code=checksumcode[i];
		if(typeof (code)=='string'){
		    //˫����������&jsquot&&&;,Ҫ�滻����
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
		//js ��ַ��jsver �ǰ汾��
		var js=urlSplit[0];
		var jsver=urlSplit[1];
		var ext=getExt(js);
		//���֧�ֱ��ش洢���Ǵ洢�����ش洢��ģʽ
        if ('localStorage' in window&&isStore){
			//��ȡ��һ���汾
			var lastver= localStorage.getItem(js);
			//����ǵ�һ�μ��ؽű��������°汾,����Ҫ����վ�ϸ���
			if(!lastver||(jsver!=lastver)){
				isfromLocal=false;
			}
		}
		else{
			isfromLocal=false;
		}
		
		var jsCode="";
		//����ӱ��ض�ȡ�����ȡ
		if(isfromLocal){
			
			jsCode=localStorage.getItem(js+"?code");
		}
		else{
		//���֧�ֱ��ش洢��ͬ������̬��Դ����ֵ��jscode,��д��localstorage
	
			if ('localStorage' in window&&isStore){
		
				//��ȡ��һ���汾
			    var lastver= localStorage.getItem(js);
                //����汾�ź�5λ����1�������ʹ������ģʽ������ȫ������
                var incver=parseInt(jsver.substr(jsver.length-3,3));
				var incOldVer=-10;
				if(lastver){
					incOldVer=parseInt(lastver.substr(lastver.length-3,3));
				}
			
                if(incver-incOldVer!=1){
                    incMode=false;
                }
				//���������ģʽ,�����ϸ��汾����
				if(incMode&&lastver){
						
					jsUrl=getIncUrl(js,lastver,jsver);
				}
				else{
				    
					jsUrl=js.replace(ext,"-"+jsver+ext);
				}

			    xhr(jsUrl,function(data){
					//���������ģʽ,�����ϸ��汾����
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