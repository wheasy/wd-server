'use strict';

let path = require('path');
let fs = require('fs');

let reg_import = /@import *[\"\']([a-z,A-z,\\,\/,\-,.]+)[\"\'];?/gi;

module.exports = function(filepath, config, callback) {
    let lessPath;
    lessPath = filepath.replace(/\.css$/,'.less')


    // 解析LESS
    let code;
    try {
        code = fs.readFileSync(lessPath, "utf8");
        if (!code) {
            console.error('%s is empty;\n request file is %s', lessPath, filepath);
            callback('/* ' + filepath + ' is empty */');
            return;
        }
    } catch (err) {
        if(require('file-plus').statSync(filepath)){
            lessPath = filepath;
            code = fs.readFileSync(lessPath, "utf8");
        }else{
            console.error(err);
            callback('/* ' + filepath + ', ' + lessPath + ' is miss */');
            return;
        }
    }
    let lessObj  = {data:code};

    processImport(lessObj, config);

    require('less').render(lessObj.data, {
        compress: config.compress
    }, function(err, output) {
        if (err) {
            console.error(err);
            let line = 1;

            callback(JSON.stringify(err) + 
                '\n input is \n' + 
                lessObj.data.replace(/([^\n]*)\n?/ig, function(a, b, c) {
                    return line++ + '  ' + b + '\n';
                }));
        } else {
            callback(lessObj.error + output.css);
        }
    });
}
function processImport(lessObj, cfg) {
    lessObj.imported = lessObj.imported || {};
    lessObj.error = lessObj.error || [];

    lessObj.data = lessObj.data.replace(reg_import, 
            function(importstr, fpath) {

        if (lessObj.imported[fpath]) {
            return '/* file:' + fpath + ' has been imported */\n'
        }
        lessObj.imported[fpath] = true;
        let c = readLess(fpath, cfg);
        if(c){
            return '/* ' + fpath + '  */\n' + c + '\n'
            // imports.unshift('/* file:' + fpath + ' has been imported */\n' + c + '\n');
        }
        lessObj.error.push('/* ' + fpath+' is miss */ \n');
        return '/* file:' + fpath + ' is miss */\n';
    });
    if (reg_import.test(lessObj.data)) {
        processImport(lessObj, cfg);
    }
};
function readLess(fpath, cfg){
    try{
        return fs.readFileSync(path.join(cfg.root, 'cssLib', fpath + '.less'), 'utf8');
    }catch(err){
        console.error(path.join(cfg.root, 'cssLib', fpath + '.less') + 'is miss');
        return null
    }
}