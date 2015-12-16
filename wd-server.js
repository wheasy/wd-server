#!/usr/bin/env node

'use strict';

require('console-prettify')();

var url = require("url");
var fs = require("fs");
var path = require("path");

var program = require('commander');
var lutil = require('lang-utils');

var config = require("./cfg/wdsvr");
var fileTypes = require('./cfg/fileType');
var mime = require('./cfg/mime');


program
    .version(require('./package.json').version)
    .option('-d, --dir <sire root>', '站点根目录')
    .option('-p, --port <port>', '端口号')
    .option('-r, --realPath <port>', '发布目录')
    .parse(process.argv);


let root    = program.dir || process.cwd();
let cfgPath = path.join(root, '.wdsvr');

// 创建新项目
if(program.args[0] == 'create'){
    require('./lib/creator')(root);
    return;
}


try {
    let userCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    config = Object.assign(config, userCfg);
    if(config.mime){
        mime = Object.assign(mime, config.mime);
    }
} catch (error) {
    let stat = tryStat(cfgPath);
    if(stat){
        console.error('parse json error;\t%s isn\'t a json file!', cfgPath);
    }else{
        console.warn('you can config server with "%s".\n' +
        ' you also can join the qq group(370792320) to get help!', cfgPath);
    }
}

config.root = root;
config.blocks = path.join(root, 'blocks');
// 发布
if(program.args[0] == 'build'){
    config.realPath = program.realPath || '_build'
    require('./lib/build')(config);
    return;
}

let port = program.port || config.port || 8180;

//创建http服务端
let server = require("http").createServer(function(request, response) {

    response.setHeader("Server", "lesser");
    // 字体跨域访问
    response.setHeader('Access-Control-Allow-Origin', "*");
    // 强制缓存，方便手机调试
    response.setHeader('CacheControl', 'no-store');

    let pathname =  decodeURI(url.parse(request.url).pathname),
        realPath = path.join(root, pathname),
        stat = tryStat(realPath);

    // 文件列表
    if (stat && stat.isDirectory()) {
        dirHandle(response, request, realPath, config);
    } else {
        fileHandle(response, request, realPath, config);
    }
});
var temp_i = 0;
server.on('error', function(e){
    if (e.code == 'EADDRINUSE' )  {
        if(temp_i++ >= 10){
            console.log('尝试超过十次！');
            return;
        }
        console.warn('端口 %s 被占用，尝试从 %s 启动', port, ++port);
        setTimeout(function() {
            server.close();
            server.listen(port);
        }, 100);
        return;
    }
    console.info('服务启动失败:');
    console.log(e.stack);
})
server.on('listening', function(){

    var ips = lutil.getLocalIp();
    console.log('server is listening on %d', port);
    console.log('you can visit with:')

    ips.forEach(function(ip){
        // 过滤 127.0.0.1
        // if(ips.length > 1 && (ip === '127.0.0.1' || ip === '0.0.0.0')){
        //     return;
        // }
        console.info('  http://%s:%s',ip, port);
    });

})
server.listen(port);

function fileHandle(response, request, realPath, config) {
    let pathname    = path.relative(config.root, realPath);
    let ext         = path.extname(pathname);
        ext         = ext ? ext.slice(1) : 'unknown';
    let contentType = mime[ext] || "text/plain";

    response.setHeader("Content-Type", contentType);

    if(pathname.indexOf('__assets') == 0){
        config = {
            root: path.join(__dirname,'assets'),
            ignore:0
        }
        realPath = path.join(config.root, pathname.replace('__assets', ''));
    }

    if (ext == 'css') {
        require('./lib/lesser')(realPath, config, function(css) {
            response.end(css);
        });
        return;
    }

    if (!tryStat(realPath)) {
        response.writeHead(404, "not found", {
            'Content-Type': 'text/plain'
        });
        console.warn(realPath + " is not found")
        response.end(realPath + " is not found");
        return;
    }

    if (ext === 'html' || ext === 'htm') {
        require('./lib/engine')(realPath, {
                blockDir: config.blocks
            },
            function(data) {
                var beautify = require('jstransformer')(require('jstransformer-html-beautify'))
                response.end(beautify.render(data).body);
            });
    }
    require('fs').readFile(realPath, function(err, data) {
        if (err) {
            data = JSON.stringify(err)
        }
        response.end(data);
    })
}

function dirHandle(response, request, realPath, config) {
    let files = fs.readdirSync(realPath);
    let pathname = path.relative(config.root, realPath);
    let printList = [];
    files.forEach(function(f, i) {
        // 不在过滤列表
        if (!lutil.inArray(f, config.ignore)) {
            let stat = tryStat(path.join(realPath, f));
            let type = path.extname(f);
            type = type ? type.slice(1) : 'unknown';

            let isDir = stat && stat.isDirectory();
            if (isDir) {
                type = 'folder'
            }

            printList.push({
                path: (pathname + '/' + f).replace(/\/+/g, '/'),
                name: f,
                isDir: isDir,
                type: type,
                icon: !!fileTypes[type] ? type : 'other'
            });
        }
    });
    printList = printList.sort(function(item) {
        return item.isDir <= 0
    })
    response.setHeader("Content-Type", mime['html']);
    response.end(getTpl('dir')({
        list: printList
    }))
}

function tryStat(path) {
    try {
        return fs.statSync(path);
    } catch (e) {
        return undefined;
    }
}

let tplDir = path.join(__dirname, 'template');

function getTpl(name) {
    try {
        return require('./lib/arttemplate').render(fs.readFileSync(path.join(tplDir, name + '.html'), 'utf8'))
    } catch (err) {
        console.error(err);
        return function(a) {
            return a
        }
    }
}