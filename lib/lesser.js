'use strict';

let path = require('path');
let fs = require('fs');

let reg_import = /@import *[\"\']([a-z,A-z,\\,\/,\-]+)[\"\'];?/gi;

module.exports = function(filepath, config, callback) {
    let lessPath;
    let relPath = path.relative(config.root, filepath);
    let cssDir = relPath.split(path.sep)[0];
    if (cssDir === 'css' || cssDir === 'style') {
        relPath = relPath.replace(/css/,'less');
        let obj = path.parse(relPath);
        lessPath = path.join(config.root, obj.dir, obj.name+ '.less');
    } else {
        try {
            callback(fs.readFileSync(filepath, "utf8"));
        } catch (error) {
            console.error(filepath + ' is miss \n', error);
            callback('/* ' + filepath + ' is miss */');
        }
        return;
    }
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
        console.error(err);
        callback('/* ' + filepath + ' is miss */');
        return;

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
        return fs.readFileSync(path.join(cfg.root, 'less', fpath + '.less'), 'utf8');
    }catch(err){
        console.error(path.join(cfg.root, 'less', fpath + '.less') + 'is miss');
        return null
    }
}