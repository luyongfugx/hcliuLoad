依赖node.js环境 依赖java环境
node.js 安装
http://nodejs.org/ 下载最新版本安装
安装完成后 在windows的命令行 输入 node回车
如果成功进入node环境 则说明安装正确

java 安装
http://www.java.com/zh_CN/download/manual.jsp#win

工具所有配置文件为不严格的json格式(不要求键名使用双引号 键名和值都可以使用单引号等等);
成功打包后程序自动退出
打包失败后程序暂停并提示 等待用户关闭
只能同时运行一个打包程序 否则会提示用户


下载最新版本安装
安装完成后 在windows的命令行 输入 java回车
如果显示java帮助回显 则说明安装正确

使用方法:
	node c:\build\build.js d:\info\news\build.conf d:\info\news\ver.conf 
	第二个参数为本工具所在路径
	第三个参数为项目打包配置路径
	第四个参数为项目静态资源版本配置路径

工具配置:
	setting.conf
		// yui jar包路径
		cssCompiler: './lib/yuicompressor-2.4.7.jar',
		// google cloure jar包路径
		jsCompiler: './lib/compiler.jar',
		// 临时文件目录
		temp: '_temp'

项目配置：
	ver.conf: 版本配置 (此处只需第一次使用时配置 以后会自动更新)
		// 当前版本 前7位是日期 后面两位是个人标识 后三位是此项目今天第几次打包,打包程序会每次把后3为加1，
		//前端load程序会判断后三位间隔是否为1，只有为1才启用增量更新,否则使用全量，如果不支持loadstorage，
		//则程序会自动切换到script标签模式加载
		ver: '2013051401067',
		// 个人标识
		personalFlag: '01',

	build.conf: 打包配置 (此文件上传到svn 在项目内共享)
		{
		// 键名为目标文件 {ver}会替换成版本号 {md5}会计算文件md5
		'./release/client-{ver}.js': {
		        //增量更新算法中块的大小,具体看原理文档
			chunkSize:12,
			// files 为需要合并的文件 支持本地路径 和 http url
			files:['client.js']
			}
		}

 以client.js为例，第一个版本运行build.bat后会在release目录生成client-2013062801001.js,
 第二次发布修改了client.js,运行buile.bat，会生成client-2013062801001_2013062801002.js,
 client-2013062801002.js
 在需要引入这个的js里面首先需要引入hcliuLoad.js
  <script type="text/javascript" src="hcliuLoad.js"></script>
 然后：
<script>
/*
@param url js地址，参数表版本号
@param store 表示是否存入localstorage
@param mode 表示更新模式，只有store为true的时候才有作用，inc 为true表示增量更新，为false表示全亮更新,function是callback函数

hcliuRequire.load({"url":"http://test.com/client.js?2013062801002","store":true,"inc":true},function(){alert("load callback!")});
*/
hcliuLoad.load({"url":"http://test.com/client.js?2013062801002","store":true,"inc":true},function(){alert("load callback!")});
</script>
这样前段会根据规则引入client-2013062801001_2013062801002.js或者 client-2013062801002.js
如果上一个版本有本地存储，且后三位版本号间隔为1，则引入client-2013062801001_2013062801002.js，并跟老文件合并成新的js，存入本地存储
否则引入client-2013062801002.js进行全量更新

		

