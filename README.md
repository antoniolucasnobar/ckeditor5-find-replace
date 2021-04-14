CKEditor 5 Find and Replace feature
============================

This package implements Find and Replace Text in CKEditor 5.

I looked everywhere and did not find an solution for CKEditor 5. So I did it one.

It supports:
- forward and backwards search (with visual and text indications of progress)
- replace one or all occurrences
- accessible (keyboard operation)
- use out of the editor (by execute findReplace command)

We need translators! If you want to translate to your language, open a PR! Supported so far:
- pt-BR
- en-US
- zh-CN

## Installation
```shell script
$ npm install ckeditor5-find-replace
```

To use it, configure your build like this

```javascript
import FindReplace from 'ckeditor5-find-replace/src/findReplace';

// it can be any CKEditor editor. Decoupled is just an example
DecoupledEditor.builtinPlugins = [
//...
	FindReplace,
]
//...
	toolbar: {
		items: [
			'FindReplace'
        ]
    }
```

```javascript
// you can use this feature programatically also:
editor.execute('findReplace', {
    // text to find
    findText: '',
    // find prev or next , -1:prev,0:stay,1:next
    increment: 1 ,
    // text to replace
    replaceText: '',
    // is replaceAll
    replaceAll: false,
})
```


Images of plugin:

![Plugin](docs/plugin.png)

![Search in action](docs/search.png)

![replace](docs/replace-all.png)

![Not found](docs/not-found.png)

## License

MIT
