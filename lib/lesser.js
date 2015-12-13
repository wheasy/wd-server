'use strict';

let path = require('path');
let fs = require('fs');

let reg_import = /@import *[\"\']([a-z,A-z,\\,\/,\-]+)[\"\'];?/gi;

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
            callback('/* %s, %s is miss */', filepath, lessPath);
            return;
        }
    }
    code = processImport(code, config);

    require('less').render(code[0], {
        compress: config.compress
    }, function(err, output) {
        if (err) {
            console.error(err);
            callback(JSON.stringify(err)+'\n'+ code);
        } else {
            callback(code[1] + output.css);
        }
    });
}
function processImport(lessCode, cfg, imported, errorCode) {
    imported = imported || {};
    errorCode = errorCode || '';

    lessCode = lessCode.replace(reg_import, function(importstr, fpath) {
        if (imported[fpath]) {
            return '/* file:' + fpath + ' has been imported */\n'
        }
        imported[fpath] = true;
        let c = readLess(fpath, cfg);
        if(c){
            return c
        }
        errorCode += '/* ' + fpath+' is miss */ \n'
        return '';
    });
    if (reg_import.test(lessCode)) {
        let ret = processImport(lessCode, cfg, imported, errorCode);
        lessCode += ret[0];
        errorCode += ret[1];
    }
    return[lessCode, errorCode]
};
function readLess(fpath, cfg){
    try{
        return fs.readFileSync(path.join(cfg.root, 'cssLib', fpath + '.less'), 'utf8');
    }catch(err){
        console.error(path.join(cfg.root, 'cssLib', fpath + '.less') + 'is miss');
        return null
    }
}