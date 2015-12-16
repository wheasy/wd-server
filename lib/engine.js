//渲染引擎
// var debug = require('debug')('http');
var nodeAssert = require('assert');
var nodePath = require('path');
var nodeFs = require('fs');
var nodeUtil = require('util');

var reg_block = /<(block\:([a-z,A-Z,0-9,\-,\_,\/]+))([^\/]*?)(?:(?:>([\s\S]*)<\/block>)|(?:\/>))/gi;
var reg_module_attrs = /(\w+)=['"]?([^"'\s]+)['"]?/ig;
var reg_def = /<def:([a-z,A-Z,0-9,\-,\_]+)[\s]*?>([\s\S]*?)<\/def>/ig;
var reg_point = /<point:([a-z,A-Z,0-9,\-,\_]+)[\s]*?\/?>/ig;
var reg_scope = /<scope:([^>]+)>/ig;
var art = require('./arttemplate');
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
        var code = nodeFs.readFileSync(filePath).toString();

        pageObj = preCompile(code, cfg);

        pageObj.mtime = nodeFs.statSync(filePath).mtime;
        //处理图片的绝对路径
        pageObj.tpl = art.render(processImageAbsPath(pageObj.code, cfg));

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
    while (reg_block.test(code)) {
        if (++count == 1000) {
            console.error('astro.engine-->出现模块相互引用\n' + code)
            return '<div class="mo-error">block循环引用超过100次</div>';
        }
        code = code.replace(reg_block, function(fullCode, modstr, modName, attrs, modcontent) {
            var retStr = '';
            var modCode;
            var modPath = nodePath.join(cfg.blockDir, modName + '.html');
            if (!nodeFs.existsSync(modPath)) {
                console.error('astro.template-->未找到 ' + modName + ' 模块,' + modPath);
                modCode = '';
            } else {
                modCode = nodeFs.readFileSync(modPath, 'utf8');
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
                    return '<!-- warn: point:' + name + ' is not defined; modname is' + modName + ' -->';
                });
                //没有插入点，则替换 <point:default>
                var hasDefaultPoint;
                if (!hasPoint) {
                    //
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
    return {
        code: code,
        components: componentsList,
        attrList : attrList
    };
}


function getDefined(code) {
    var defined = {};
    var blocks = {};
    var gid = Date.now();

    // 匹配 def 标签时，防止出现def中有block，且block中有def的情况
    // <block:b1>
    //  <def:p1>
    //      <block:b2>
    //          <def:p1>
    //          </def>
    //      </block>
    //  </def>
    // </block>
    code = code.replace(reg_block, function(a,b){
        blocks['$__' + ++gid + '__'] = a;
        return '$__' + gid + '__'
    });

    code.replace(reg_def, function(code, name, ctx) {
        defined[name] = ctx.replace(/\$__\d+__/ig, function(a){
            return blocks[a]?blocks[a]:a
        });
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
