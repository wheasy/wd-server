#light-server 

light-server 是一个轻量的Web Server。支持LESS（SASS、Stylus什么的，等后续吧。。。）解析、支持简单的模板继承。

`light-server` 的目的在于简化前端开发环境。支持LESS解析、
模板机制（是的，还支持继承，你不必把页头反复考来考去了）。但有一下
几点需要注意：

1. LESS中`import`强制改为绝对路径。基于根目录的 less路径。
2. LESS文件必须放到`less`目录。访问规则如下：<br/>
    /css/user/login.css&nbsp;&nbsp;&lt;&lt;----&nbsp;&nbsp;/less/user/login.less
3. light-server会禁用浏览器缓存，这样不必修改版本号，方便手机端开发


### 安装

```
$ sudo npm install light-server -g
```

### 下载示例站点

包括样式引用和模板机制的使用

```
    git clone https://github.com/wheasy/light-server-example.git
```

> 如果没有git，可直接[下载](#)源码。


### 示例

假设站点根目录位于  `~/project/site`

在站点根目录启动

```
$ cd ~/project/site
$ light-server
```

在任意位置启动站点，并指定`端口号`

```
$ light-server -d ~/project/site -p 8080
```

### 目录结构
light-server有三个特殊文件（夹）

文件（夹）名称|说明
----|----
blocks|  模板存放目录
less|    LESS文件存放目录
.light   |可通过该文件配置light-server

light-server 默认不会显示这三个文件

###.light 详解

位于站点根目录，可通过该文件配置服务。

>默认端口号为8180
>
>light-server内置常见mime，可通过mime进行补充

```
{
    // 端口号
    "port": 8180,
    // 忽略文件
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
如有疑问或建议，请在[这里](https://github.com/wheasy/light-server/issues)上留言。


<!--
##其他

如果`light-server`不能满足你的需求，请不必沮丧，还有一个叫[Astros](#)的项目，除了`light-server`的功能，还具备自支持模块化开发、自动合并JS依赖、自动合成雪碧图和字体文件等功能。

-->