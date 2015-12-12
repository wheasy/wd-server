//渲染引擎
// var debug = require('debug')('http');
var nodeAssert = require('assert');
var nodePath = require('path');
var nodeFs = require('fs');
var nodeUtil = require('util');

var reg_module = /<(block\:([a-z,A-Z,0-9,\-,\_,\/]+))([^\/]*?)(?:(?:>([\s\S]*)<\/block>)|(?:\/>))/gi;
var reg_module_attrs = /(\w+)=['"]?([^"'\s]+)['"]?/ig;
var reg_def = /<def:([a-z,A-Z,0-9,\-,\_]+)[\s]*?>([\s\S]*?)<\/def>/ig;
var reg_point = /<point:([a-z,A-Z,0-9,\-,\_]+)[\s]*?\/?>/ig;
var reg_scope = /<scope:([^>]+)>/ig;
var art = require('./arttemplate');
var TPLCACHE = {};
var COMPONENTSCACHE = {};
/**
 * [renderPage description]
 * @param  {String}   pageName 页面名称 home,list/shop.html
 * @param  {[type]}   options  [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
*/
function renderPage(pagepath, options, callback) {
    var data = {};
    try {
        var fileData = {};
        // 文件不存在，则返回异常
        if (!options.blockDir) {
            throw new Error('未设置组件目录')
            return;
        }
        var pageObj = getPageInfo(pagepath, data, options, fileData);
        if (!pageObj) {
            callback(new Error(filePath + ' is not found'), null);
            return;
        }

        data.$tpldata = fileData;
        for(var p in pageObj.attrList){
            data[p] = pageObj.attrList[p];
        }
        callback(pageObj.tpl(data));

    } catch (err) {
        console.error('Pandora.engine.renderPage:', err);
        callback(err, '模板渲染异常');
    }
}
// 
/**
 * 检查是否过期
 * @param  {String} filePath 检查文件
 * @return {Boolean} 如果已过期，则返回true
 */
function checkExpire(filePath, cfg) {
    //为设置缓存key或没有缓存，则返回false
    if (!TPLCACHE[filePath] || (TPLCACHE[filePath].mtime - nodeFs.statSync(filePath).mtime != 0)) {
        return true;
    }
    // 依赖的模块对象
    var pageCpts = TPLCACHE[filePath].components;
    var mod;
    for (var mname in pageCpts) {
        mod = pageCpts[mname];
        // if (mod.mtime - COMPONENTSCACHE[mname].mtime != 0 && ) {
        if (mod.mtime - nodeFs.statSync(filePath).mtime != 0) {
            return true;
        }
    }
    return true;
}

function getPageInfo(filePath, options, cfg, fileData) {  
    var stat = tryStat(filePath);
    if (!stat || !stat.isFile()) {
        console.error('Page(' + filePath + ') is not found!');
        callback(new Error('Page(' + filePath + ') is not found!'), null);
        return;
    }
    if (!nodeFs.existsSync(filePath)) {
        return null;
    }
    var pageObj;
    // if (cfg.cache == false || checkExpire(filePath, cfg)) {
    // 
        var code = nodeFs.readFileSync(filePath).toString();

        pageObj = preCompile(code, cfg);

        pageObj.mtime = nodeFs.statSync(filePath).mtime;
        //处理图片的绝对路径
        pageObj.tpl = art.render(processImageAbsPath(pageObj.code, cfg));
        // TPLCACHE[filePath] = pageObj;
        // console.info('noCache', filePath);
    // } else {
    //     pageObj = TPLCACHE[filePath];
    //     console.info('Cached', filePath);
    // }
    return pageObj;
}

function preCompile(code, cfg) {
    if (!code) {
        throw new Error('Pandora.engine: perCompile param "code" is undefined');
    }
    var count = 0;
    var hasScope = false;
    var componentsList = {};
    var gid = Date.now();
    var attrList = {};
    while (reg_module.test(code)) {
        if (++count == 1000) {
            console.error('astro.engine-->出现模块相互引用\n' + code)
            return '<div class="mo-error">Module循环引用超过100次</div>';
        }
        code = code.replace(reg_module, function(fullCode, modstr, modName, attrs, modcontent) {
            var retStr = '';
            var modCode;
            var modPath = nodePath.join(cfg.blockDir, modName + '.html');
            if (!nodeFs.existsSync(modPath)) {
                console.error('astro.template-->未找到 ' + modName + ' 模块,' + modPath);
                modCode = '';
            } else {
                modCode = nodeFs.readFileSync(modPath, 'utf8');

                // COMPONENTSCACHE[modName] = {
                //     mtime: nodeFs.statSync(modPath).mtime
                // };
                // componentsList[modName] = {
                //     mtime: COMPONENTSCACHE[modName].mtime,
                //     path: modPath
                // };
            }
            if (modCode) {
                //不是闭合标签，中间有内容
                var defined = modcontent ? getDefined(modcontent) : {};
                var hasPoint;
                hasScope = false;
                // 实现scope，转换字段指向
                var attrHash = {};
                if (reg_module_attrs.test(attrs)) {
                    attrs.replace(reg_module_attrs, function(str, name, value) {
                        attrHash[name] = value;
                    });
                    if (attrHash.scope) {
                        hasScope = true;
                        retStr += '{{var ' + attrHash.scope + '}}';
                    }
                }
                modCode = modCode.replace(/\$attr\./g, '$attr' + ++gid+'.');
                attrList['$attr' + gid] = attrHash;
                // 替换插入点
                retStr += modCode.replace(reg_point, function(str, name) {
                    if (defined[name]) {
                        return defined[name];
                    } else {
                        // 没有实现插入点时，则替换把内容替换到第一个 point中
                        if (isEmpty(defined) && !hasPoint) {
                            hasPoint = true;
                            return modcontent;
                        }
                    }
                    hasPoint = true;
                    return '<!-- error: point:' + name + ' is not defined; modname is' + modName + ' -->';
                });
                //没有插入点，则替换 <point:default>
                var hasDefaultPoint;
                if (!hasPoint) {
                    // retStr += modCode.replace(/<point-default[^>]*?\/?>/ig, function() {
                    //     hasDefaultPoint = true;
                    //     return modcontent || '';
                    // });
                    // if(!hasDefaultPoint){
                    //     console.error('astro.template-->模块' + modname + '没有引用插入点');
                    // }
                }
                if (hasScope) {
                    retStr = retStr + '{{/var}}';
                }
                return retStr;
            } else {
                return '<div class="mo-error">未找到模块:' + modName + '</div>';
            }
        });
    };
    // var scopes = [];
    // code = code.replace(/<scope:(\S+=\S+)>/ig, function(a, c) {
    //     // scopes.push(c);
    //     return '{{var ' + c + '}}'
    // });
    // code = code.replace(/<\/scope>/ig, '{{/var}}');
    //

    return {
        code: code,
        components: componentsList,
        attrList : attrList
    };
}
//获取模块引用的js
// function getComponentJs(filePath) {
//     //获取模块名
//     var name = nodePath.basename(filePath, '.html');
//     var jsFile = nodePath.join(nodePath.dirname(filePath),name+'.js');
//     //nodePath.relative(from, jsFile);
//     if(nodeFs.existsSync(jsFile)){

//         return jsFile;
//     }else{
//         return false;
//     }
// }


function getDefined(code) {
    var defined = {};
    code.replace(reg_def, function(code, name, ctx) {
        defined[name] = ctx;
        return code;
    });
    return defined
}

function isEmpty(obj) {
    for (var i in obj) {
        return false;
    }
    return true;
}


module.exports = renderPage;

function tryStat(path) {
    try {
        return nodeFs.statSync(path);
    } catch (e) {
        console.log(e);
        return undefined;
    }
}


function processImageAbsPath(code, cfg) {
    if (!code) {
        return 'null';
    }
    // code = code.replace(/isrc=[\'\"]?(?!http)~(.*?)/g, function(str, imgpath) {
    //     return nodeUtil.format('src="%s%s', cfg.cdn, imgpath);
    // });
    return code
}
