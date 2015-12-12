#light-server 

light-server 是一个轻量的Web Server。支持LESS和
SASS解析、支持简单的模板继承。

`light-server` 的目的在于简化前端开发环境。支持LESS和SASS解析、
模板机制（是的，还支持继承，你不必把页头反复考来考去了）。但有一下
几点需要注意：

1. LESS和SASS中`import`强制改为绝对路径。基于根目录的 less路径。
2. LESS和SASS文件必须放到`less`或`sass`目录。访问规则如下：<br/>
    /css/user/login.css&nbsp;&nbsp;&lt;&lt;----&nbsp;&nbsp;/less(or sass)/user/login.less(sass)


## 安装

```
$ sudo npm install light-server -g
```

## 下载示例站点

包括样式引用和模板机制的使用

```
    git clone https://git
```
>如果没有git，可直接[下载](#)源码。


## 示例

```
$ cd ~/project/site
$ light-server 
```

## 答疑
如有疑问或建议，请在[github](#)上留言。


<!--
##其他

如果`light-server`不能满足你的需求，请不必沮丧，还有一个叫[Astros](#)的项目，除了`light-server`的功能，还具备自支持模块化开发、自动合并JS依赖、自动合成雪碧图和字体文件等功能。

-->