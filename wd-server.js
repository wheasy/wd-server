#!/usr/bin/env node

'use strict';

require('console-prettify')();

var url = require("url");
var fs = require("fs");
var path = require("path");
var readline = require('readline');

var program = require('commander');
var lutil = require('lang-utils');

var config = require("./cfg/wdsvr");
var fileTypes = require('./cfg/fileType');
var mime = require('./cfg/mime');


program
    .version(require('./package.json').version)
    .option('-d, --dir [value]', '站点根目录')
    .option('-p, --port <n>', '端口号', '8180', parseInt)
    .option('-r, --realPath [value]', '发布目录');

program.on('--help', function() {
    console.log('  Examples:\n');
    console.log('    启动服务');
    console.log('    $ wd-server\n');
    console.log('    或：\n$ wd-server -d ~/project/site -p 8888\n');
    console.log('    创建项目');
    console.log('    $ wd-server create -d ~/project/site\n');
    console.log('    打包项目');
    console.log('    $ wd-server build -d ~/project/site');
    console.log('');
});

program.parse(process.argv);

let root = program.dir || process.cwd();
let cfgPath = path.join(root, '.wdsvr');

// 创建新项目
if (program.args[0] == 'create') {
    require('./lib/creator')(root);
    return;
}

try {
    let userCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    config = Object.assign(config, userCfg);
    if (config.mime) {
        mime = Object.assign(mime, config.mime);
    }
} catch (error) {
    let stat = tryStat(cfgPath);
    if (stat) {
        console.error('parse json error;\t%s isn\'t a json file!', cfgPath);
    } else {
        console.warn('you can config server with "%s".\n' +
            ' you also can join the qq group(370792320) to get help!', cfgPath);
    }
}

config.root = root;
config.blocks = path.join(root, 'blocks');
config.log = config.log !== false;
let igKey = program.args[0] == 'build' &&
    config['build_ignore'] ? 'build_ignore' : 'ignore';

config.ignore = (config[igKey] || []).map(function(item) {
    return new RegExp(item.replace('*', '.*')
        .replace('?', '\\?').replace('.', '\\.')
        .replace('(', '\\(').replace(')', '\\)')
        .replace('[', '\\[').replace(']', '\\]')
        .replace('+', '\\+'), 'i');
});

// 发布
if (program.args[0] == 'build') {
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

    let pathname = decodeURI(url.parse(request.url).pathname),
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
server.on('error', function(e) {
    if (e.code == 'EADDRINUSE') {
        if (temp_i++ >= 10) {
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
server.on('listening', function() {

    console.log('server is listening on %d', port);
    console.log('you can visit with:')
    var ips = lutil.getLocalIp();
    var fmt = 'http://%s:%s';
    var opener = require('opener');
    var util = require('util');
    var i = [];
    ips.forEach(function(ip, idx) {
        // 过滤 127.0.0.1
        // if(ips.length > 1 && (ip === '127.0.0.1' || ip === '0.0.0.0')){
        //     return;
        // }
        i.push(idx+1);
        console.info(' (%s) '+fmt, idx + 1, ip, port);
    });
    if(ips.length == 1){
        opener(util.format(fmt,ips[0],port));
        return;
    }
    getInput('你可以选择一个地址在浏览器中打开，序号('+i.join('|')+')：', function(input){
        input = parseInt(input) -1
        if(ips[input]){
            opener(util.format(fmt,ips[input],port));
            return;
        }
        console.log('');
    });

})
server.listen(port);

function fileHandle(response, request, realPath, config) {
    let pathname = path.relative(config.root, realPath);
    let ext = path.extname(pathname);
    ext = ext ? ext.slice(1) : 'unknown';
    let contentType = mime[ext] || "text/plain";

    response.setHeader("Content-Type", contentType);

    if (pathname.indexOf('__assets') == 0) {
        config = {
            root: path.join(__dirname, 'assets'),
            ignore: [],
            log: config.log
        }
        realPath = path.join(config.root, pathname.replace('__assets', ''));
    }


    if (!tryStat(realPath)) {
        if (ext == 'css') {
            require('./lib/lesser')(realPath, config, function(css) {
                response.end(css);
            });
            config.log && console.log('200 ', request.url);
            return;
        }
        response.writeHead(404, "not found", {
            'Content-Type': 'text/plain'
        });
        response.end(realPath + " is not found");
        config.log && console.warn('404 ', request.url);
        console.warn(realPath + " is not found")
        return;
    }
    if (ext === 'html' || ext === 'htm') {
        if (config.enableBlock !== false) {
            require('./lib/engine')(realPath, {
                    blockDir: config.blocks,
                    openTag:config.openTag,
                    closeTag:config.closeTag,
                    g: config.globalData || {}
                },
                function(data) {
                    var beautify = require('jstransformer')(require('jstransformer-html-beautify'))
                    response.end(beautify.render(data).body);
                });
        } else {
            var beautify = require('jstransformer')(require('jstransformer-html-beautify'))
            response.end(beautify.render(require('fs').readFileSync(realPath, 'utf8')).body);
        }
        config.log && console.log('200 ', request.url);
        return;
    }

    require('fs').readFile(realPath, function(err, data) {
        if (err) {
            config.log && console.log('500 ', request.url);
            data = JSON.stringify(err)
        } else {
            config.log && console.log('200 ', request.url);
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
        let ignored;
        for (let x in config.ignore) {
            if (config.ignore[x].test(f)) {
                ignored = true;
                break;
            }
        }
        if (!ignored) {
            let stat = tryStat(path.join(realPath, f));
            let type = path.extname(f);
            type = type ? type.slice(1) : 'unknown';

            let isDir = stat && stat.isDirectory();
            if (isDir) {
                type = 'folder'
            }

            printList.push({
                path: ('/'+pathname + '/' + f).replace(/\/+/g, '/'),
                name: f,
                isDir: isDir,
                type: type,
                icon: !!fileTypes[type] ? type : 'other'
            });
        }
    });

    printList = printList.sort(function(a, b) {
        if (a.isDir) {
            return -1;
        }
        if (b.isDir) {
            return 1;
        }
        return a.name.charCodeAt(0) - b.name.charCodeAt(0);
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
function getInput(msg, callback) {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question(msg, function(input) {
        rl.close();
        callback(input);
    });
}