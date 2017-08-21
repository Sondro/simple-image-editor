var URL = window.URL && window.URL.createObjectURL ? window.URL :
    window.webkitURL && window.webkitURL.createObjectURL ? window.webkitURL :
    null;

function getImgFromUrl (url, callback) {
    var img = new Image();

    img.onload = function () {
        callback && callback(img);
    };
    img.src = url;
}

function getBase64FromFile(file, callback) {
    var reader = new FileReader();

    reader.onload = function () {
        callback && callback(this.result);
    };
    reader.readAsDataURL(file);
}

function getMineFromUrl(url) {
    var arr = url.split('?')[0].match(/\.(png|jpeg|jpg)$/);
    return /^(data:\s*image\/(\w+);base64,)/.test(url) ? url.split(',')[0].split(':')[1].split(';')[0] :
        arr ? 'image/' + arr[1] :
        'image/jpeg';
}

function dataURItoBlob (dataURI) {
    var byteString = atob(dataURI.split(',')[1]);
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], {type: mimeString});
};

function Editor (source) {
    var canvas = document.createElement('canvas');

    this.cvs = canvas;
    this.ctx = canvas.getContext('2d');

    this.source = source;
    this.img = {
        element: null,
        width: 0,
        height: 0,
        angle: 0,
        type: 'image/jpeg'
    };
    // 预加载
    this.ready();
}

Editor.prototype.ready = function(callback) {
    callback = callback || function(){};
    var ed = this, source = ed.source;
    if (ed.img.element) return callback(ed.img.element);

    if (source) {
        if (source.tagName && source.tagName.toLocaleLowerCase() == 'IMG' ) { // img
            getImgFromUrl(source.src, function(img){
                ed.img.element = img;
                ed.img.type = getMineFromUrl(source.src);
                callback(img);
            });
        }
        else if (/^(data:\s*image\/(\w+);base64,)/.test(source) || /^[a-z]+:\/\//.test(source)) { // base64 url
            getImgFromUrl(source, function(img){
                ed.img.element = img;
                ed.img.type = getMineFromUrl(source);
                callback(img);
            });
        }
        else if (source instanceof File || source instanceof Blob) { // file blob
            getBase64FromFile(source, function(base64){
                getImgFromUrl(base64, function(img){
                    ed.img.element = img;
                    ed.img.type = source.type;
                    callback(img);
                });
            });
        }
        else {
            callback(null);
        }
    } else {
        callback(null);
    }
}

Editor.prototype.width = function (size) {
    if (typeof size === 'number' && 0 < size) {
        this.img.width = size;
    }
    return this;
};

Editor.prototype.height = function (size) {
    if (typeof size === 'number' && 0 < size) {
        this.img.height = size;
    }
    return this;
};

Editor.prototype.rotate = function (angle) {
    if (typeof angle === 'number') {
        this.img.angle = angle;
    }
    return this;
};

Editor.prototype.toDataURL = function (type, quality) {
    var ed = this;
    if (typeof type === 'number') {
        quality = type;
        type = '';
    }

    return new Promise(function(resolve, reject) {

        ed.ready(function(img){
            if (img) {
                var width = ed.img.width || img.width;
                var height = ed.img.height || width * img.height / img.width;
                var angle = ed.img.angle;
                var cvs = ed.cvs;
                var ctx = ed.ctx;

                type = type || ed.type;
                quality = quality || 0.8;

                try {
                    if (angle == 0) {
                        cvs.width = width;
                        cvs.height = height;

                        ctx.clearRect(0, 0, cvs.width, cvs.height);
                        ctx.drawImage(img, 0, 0, width, height);
                    } else {
                        /*// 取反
                        if (angle == 180) {
                            cvs.width = width;
                            cvs.height = height;
                        } else {
                            cvs.width = height;
                            cvs.height = width;
                        }*/
                        cvs.width = width;
                        cvs.height = height;

                        ctx.save();//保存状态
                        var center = {
                            x: cvs.width / 2, // 画布宽度的一半
                            y: cvs.height / 2 // 画布高度的一半
                        };
                        ctx.translate(center.x, center.y); // 将绘图原点移到画布中点
                        ctx.rotate(angle * Math.PI / 180); // 旋转角度
                        ctx.translate(-width / 2, -height / 2);// 将内容移到中间(此时内容是已旋转的)
                        ctx.drawImage(img, 0, 0, width, height);
                        ctx.restore();//恢复状态
                    }

                    var base64 = cvs.toDataURL(type, quality);
                    resolve({base64: base64, blob: dataURItoBlob(base64)});
                } catch (e) {
                    reject('图片导出失败');
                }
            } else {
                reject('图片不存在');
            }
        });

    });
};

Editor.prototype.saveFile = function (fileName) {
    var ed = this;
    return new Promise(function(resolve, reject) {
        ed.toDataURL().then(function ({base64, blob}) {
            try {
                var aTag = document.createElement('a');
                aTag.download = fileName;
                aTag.href = base64;
                aTag.click();
                resolve(blob);
            } catch (e) {
                reject('保存失败');
            }
        }, reject);
    });
};


window.sie = function(source) {
    return new Editor(source);
};

// 版本号来自package.json，构建时自动填充
window.sie.version = PKG.version;

module.exports = window.sie;