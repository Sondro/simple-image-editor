# image-editor

###使用方式:
支持img、url、base64和file类型

```
sie('./xxx.jpg').width(100).rotate(45).saveFile('abc.jpg').then(function(file){
    console.info(file);
}, function(err){
    console.error(err);
});
```
