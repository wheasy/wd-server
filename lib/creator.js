const downloadUrl = 'https://github.com/wheasy/wd-server-example/archive/v0.0.6.tar.gz'
// const downloadUrl = 'http://172.18.11.24:8181/img/a.jpg'
var path = require('path');
var fs = require('fs');

var spawn = require('child_process').spawn;
var readline = require('readline');

var cpsource = 'wd-server-example-0.0.6';

module.exports = function(npath) {
    var gzpath = require('path').join(npath, '_package.tar.gz');

    var file = fs.createWriteStream(path.join(npath, '_package.tar.gz'));

    console.log('正在下载：%s', downloadUrl);
    file.on('finish', function(){
        console.log('解压...');
        require('tar.gz')().extract(gzpath, npath)
            .then(function(err) {
                if (err) {
                    throw err;
                }
                setTimeout(function(){
                    require('copy-dir').sync(path.join(npath, cpsource), 
                        npath);
                    require('fs-extra').remove(path.join(npath, cpsource));
                    require('fs-extra').remove(gzpath);
                    console.log('项目创建完成 ^_^');
                    console.info('站点目录为%', npath);
                    confirm('是否立即运行服务(Y/n)', function(y){
                        if(y){
                            process.chdir(npath);
                            // run((process.platform === "win32" ? "wd-server" : "npm")+' install', null, function(){
                            run("wd-server", null, function(){
                                console.log(123);
                            });
                        }
                    })
                }, 3000)
            });
    });
    require('request')(downloadUrl).pipe(file);

}


function confirm(msg, callback) {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question(msg, function(input) {
        rl.close();
        callback(/^y|yes|ok|true$/i.test(input));
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