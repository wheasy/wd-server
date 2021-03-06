module.exports = function(config) {
    'use strict';

    let fsPlus = require('file-plus'),
        lutil = require('lang-utils'),
        path = require('path'),
        fs = require('fs');

    // 发布路径
    let buildPath = path.isAbsolute(config.realPath) ?
        config.realPath :
        path.join(config.root, config.realPath);

    let files = fsPlus.getAllFilesSync(config.root, null, ['.git', '.svn', '_build']);

    var t;
    console.log('开始发布');
    files.forEach(function(item) {

        for (let x in config.ignore) {
            if (config.ignore[x].test(item)) {
                console.warn('inogre %s', item + '\t' + config.ignore[x]);
                return
            }
        }
        console.log('process %s', item);

        let p;

        switch (path.extname(item)) {
            case '.less':
                require('./lesser')(item, config, function(css) {
                    p = path.join(buildPath,
                        path.relative(config.root, item.replace(/\.less$/, '.css')));
                    fsPlus.createFileSync(p);
                    fs.writeFileSync(p, css);
                });
                break;
            case '.js':
                p = path.join(buildPath,
                    path.relative(config.root, item.replace(/\.less$/, '.css')));

                let data = fs.readFileSync(item, 'utf8');
                if (config.compress) {
                    data = require('uglify-js').minify(data, {
                        fromString: true
                    }).code;
                }
                fsPlus.createFileSync(p);
                fs.writeFileSync(p, data);
                break
            case '.html':
            case '.htm':
                require('./engine')(item, {
                    blockDir: config.blocks,
                    openTag: config.openTag,
                    closeTag: config.closeTag,
                    g: config.globalData || {}
                }, function(data) {
                    p = path.join(buildPath, path.relative(config.root, item));

                    let beautify = require('jstransformer')(require('jstransformer-html-beautify'))

                    fsPlus.createFileSync(p);
                    fs.writeFileSync(p, beautify.render(data).body);
                });
                break
            default:
                p = path.join(buildPath,
                    path.relative(config.root, item.replace(/\.less$/, '.css')));
                fsPlus.createFileSync(p);
                fs.writeFileSync(p, fs.readFileSync(item));
        }
    });
    console.info('发布成功: %s', buildPath);
}