wd-server 是一个轻量的Web Server。支持LESS（SASS、Stylus什么的，等后续吧。。。）解析、支持简单的模板继承。

`wd-server` 的目的在于简化前端开发环境。支持LESS解析、
模板机制（是的，还支持继承，你不必把页头反复考来考去了）。但有以下
几点需要注意：

1. LESS中`import`强制改为绝对路径。基于根目录的 cssLib。该目录发布时会被忽略。
2. wd-server 会禁用浏览器缓存，这样文件修改后不必修改版本号，方便手机端开发


### 安装
__安装wd-server之前，请安装Nodejs环境_

```
$ sudo npm install wd-server -g
```
__如在windows下安装，请"以管理员身份运行"命令行窗口后操作。__

### 创建项目

```
$ cd ~/project/site
$ wd-server create
```
或

```
$ wd-server create -d ~/project/site
```

### 下载示例站点
如果通过`create`命令安装失败，可手动下载。

```
git clone https://github.com/wheasy/wd-server-example.git
```

> 如果没有git，可直接[下载](https://github.com/wheasy/wd-server-example/releases)源码。


### 启动服务

假设站点根目录位于  `~/project/site`

在站点根目录启动

```
$ cd ~/project/site
$ wd-server
```

在任意位置启动站点，并指定`端口号`

```
$ wd-server -d ~/project/site -p 8080
```

### 目录结构
wd-server有三个特殊文件（夹）

名称|说明
----|----
blocks|  模板存放目录
cssLib|    LESS文件存放目录
.wdsvr   |可通过该文件配置wd-server

wd-server 默认不会显示这三个文件

### 发布
你可以通过 `wd-server build`发布站点，发布后不包括 `block`和`less`文件。

默认会解析到站点根目录的 `_build`目录，也可通过参数 `r`指定目录。

`wd-server build [d] [r]`

* d 站点根目录
* r 要发布的目录，相对路径或绝对路径

```
$ wd-server build -d ~/project/site -r ~/project/site-build
```

###.wdsvr 详解

改文件位于站点根目录，JSON格式，可通过它配置服务。

>默认端口号为8180
>
>wd-server 内置了常见mime，需要补充时，可通过mime添加

```
{
    // 端口号
    "port": 8180,
    // 是否使用模块引用，默认为true
    "enableBlock": false
    // 自带模板的开始标记，默认是<%
    "openTag":"<?",
    // 自带模板的结束标记，默认是%>
    "closeTag":"?>",
    // 忽略文件，目录索引和发布时会忽略以下文件
    "ignore": [
        ".DS_Store", 
        "blocks", 
        "less", 
        ".git", 
        ".svn", 
        ".npm", 
        "server.sh", 
        "server.bat"
    ],
    mime:{
        "html": "text/html"
        ......
    }
}
```

如需要指定端口号，可在启动时通过参数`p`指定。

### 答疑
如有疑问或建议，请在[这里](https://github.com/wheasy/wd-server/issues)上留言。或加入QQ群：370792320


<!--
##其他

如果`wd-server`不能满足你的需求，请不必沮丧，还有一个叫[Astros](#)的项目，除了`wd-server`的功能，还具备自支持模块化开发、自动合并JS依赖、自动合成雪碧图和字体文件等功能。

-->