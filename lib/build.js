module.exports = function(config) {
    'use strict';

    let fsPlus  = require('file-plus'),
        lutil   = require('lang-utils'),
        path    = require('path'),
        fs      = require('fs');

    // 发布路径
    let buildPath   = path.isAbsolute(config.realPath) ? 
            config.realPath:
            path.join(config.root, config.realPath);

    let files       = fsPlus.getAllFilesSync(config.root, null, ['.git','.svn','_build']);

    // 压缩 CSS
    config.compress = true;

    files.forEach(function(item) {

        if(lutil.inArray(
            path.relative(config.root, item).split(path.sep)[0],
             config.ignore)){return}
        if(item.indexOf(buildPath)>-1){return;}

        let p;
    
        switch (path.extname(item)) {
            case '.less':
                require('./lesser')(item, config, function(css) {
                    p = path.join(buildPath, 
                            path.relative(config.root, item.replace(/\.less$/,'.css')));
                    fsPlus.createFileSync(p);
                    fs.writeFileSync(p, css);
                });
                break;
            case '.js':
                p = path.join(buildPath, 
                    path.relative(config.root, item.replace(/\.less$/,'.css')));

                let data = require('uglify-js').
                        minify(fs.readFileSync(item, 'utf8'), {
                            fromString: true
                        }).code;

                fsPlus.createFileSync(p);
                fs.writeFileSync(p, data);
                break
            case '.html':
            case '.htm':
                require('./engine')(item, {
                    blockDir: config.blocks
                },
                function(data) {
                    p = path.join(buildPath, path.relative(config.root, item));
        
                    let beautify = require('jstransformer')(require('jstransformer-html-beautify'))

                    fsPlus.createFileSync(p);
                    fs.writeFileSync(p, beautify.render(data).body);
                });
                break
            default:
                p = path.join(buildPath, 
                    path.relative(config.root, item.replace(/\.less$/,'.css')));
                fsPlus.createFileSync(p);
                fs.writeFileSync(p, fs.readFileSync(item));
        }
        
    });
    console.info('发布成功:buildPath');
}