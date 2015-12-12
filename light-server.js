#!/usr/bin/env node

'use strict';

require('console-prettify')();

var url = require("url");
var fs = require("fs");
var path = require("path");

var program = require('commander');
var lutil = require('lang-utils');

var config = require("./light");
var fileTypes = require('./fileType');
var mime = require('./mime');



program
    .option('-d, --dir <sire root>', 'site root')
    .option('-p, --port <port>', '端口号')
    .parse(process.argv);

let root    = program.dir || process.cwd();
let cfgPath = path.join(root, '.light');


try {
    let userCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    config = Object.assign(config, userCfg);
    if(config.mime){
        mime = Object.assign(mime, config.mime);
    }
    console.log(userCfg);
} catch (error) {
    let stat = tryStat(cfgPath);
    if(stat){
        console.error('parse json error;\t%s isn\'t a json file!', cfgPath);
    }else{
        console.warn('you can')
    }
}

config.root = root;


console.info('you can config server with "%s".\n' +
    ' you can visit http:// to get help!', cfgPath);


let port = program.port || config.port || 8180;
let blockPath = path.join(root, 'blocks');

//创建http服务端
let server = require("http").createServer(function(request, response) {

    response.setHeader("Server", "lesser");
    // 字体跨域访问
    response.setHeader('Access-Control-Allow-Origin', "*");
    // 强制缓存，方便手机调试
    response.setHeader('CacheControl', 'no-store');

    let pathname = url.parse(request.url).pathname,
        realPath = path.join(root, pathname),
        stat = tryStat(realPath);

    // 文件列表
    if (stat && stat.isDirectory()) {
        dirHandle(response, request, realPath, config);
    } else {
        fileHandle(response, request, realPath, config);
    }
});
console.info('server is listening on %s', port);



server.listen(port);

function fileHandle(response, request, realPath, config) {
    let pathname    = path.relative(config.root, realPath);
    let ext         = path.extname(pathname);
        ext         = ext ? ext.slice(1) : 'unknown';
    let contentType = mime[ext == 'less' ? 'css' : ext] || "text/plain";

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
        response.end(realPath + " is not found");
        return;
    }

    if (ext === 'html' || ext === 'htm') {
        require('./lib/engine')(realPath, {
                blockDir: blockPath
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