const downloadUrl = 'https://github.com/wheasy/wd-server-example/archive/%s.tar.gz'
const version = '0.0.9'
// const downloadUrl = 'http://172.18.11.24:8181/img/a.jpg'
var path    = require('path');
var fs      = require('fs');
var util      = require('util');

var spawn    = require('child_process').spawn;
var readline = require('readline');
var process  = require('process');

var fsext    = require('fs-extra');

var cpsource = util.format('wd-server-example-%s', version);

module.exports = function(npath) {
    var gzpath = path.join(npath, '_package.tar.gz');

    var file = fs.createWriteStream(path.join(npath, '_package.tar.gz'));

    var durl = util.format(downloadUrl, version);

    console.log('正在下载：%s', durl);

    file.on('finish', function(){
        console.log('正在解压...');
        require('tar.gz')().extract(gzpath, npath)
            .then(function(err) {
                if (err) {
                    throw err;
                }
                setTimeout(function(){
                    require('copy-dir').sync(path.join(npath, cpsource), 
                        npath);
                    fsext.remove(path.join(npath, cpsource));
                    fsext.remove(gzpath);
                    console.log('项目创建完成 ^_^');
                    console.info('站点目录为%s ', npath);
                    confirm('是否立即运行服务(Y/n)', function(y){
                        if(y){
                            process.chdir(npath);
                            run((process.platform === "win32" ? "wd-server.cmd" : "wd-server"), null, function(){
                                console.log(123);
                            });
                        }
                    })
                }, 3000)
            });
    });

    var rst =  require('request')(durl)
    rst.pipe(file);
    // rst.on('data', function(){
    //     process.stdout.write('..');
    // });

}


function confirm(msg, callback) {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question(msg, function(input) {
        rl.close();
        callback(input == '' || /^y|yes|ok|true$/i.test(input));
    });
}

function run(command, opt, cb) {
    var parts = command.split(/\s+/);
    var cmd = parts[0];
    var args = parts.slice(1);
    var proc = spawn(cmd, args, {
        stdio: 'inherit'
    });
    proc.on('close', function(code) {
        if (code !== 0) {
            cb(new Error('Command exited with a non-zero status'));
        } else {
            cb(null);
        }
    });
}
