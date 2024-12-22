# async-wrap
Library with wrapper functions for async function (or functions, that return Promises)

## Install
`npm install async-wrap`

## Usage
```javascript
var asw = require('async-wrap')

asw.coalesce([1,2,3],asyncfun)
```
or
```javascript
var coalesce = require('async-wrap/coalesce')

coalesce([1,2,3],asyncfun)
```


## Overview
- [coalesce](#coalesce)


## Functions

### coalesce

Accepts two parameters:
- elements {Array}: List of elements that should be passed to the callback
- callback {function}: Async callback function (promise) that accepts an element as parameter

Use coalesce to execute a async function again, when it fails, with the next element in the elements list. E.g. you have multiple instances of a service, and want to retry the request with the next service instance if you can't connect to the first service.

Example:

Interactive example on [runkit](https://runkit.com/strernd/test-async-wrap-coalesce)

```javascript
function getItems(){
    var urls = getServiceUrls() // Returns array
    return coalesce(urls, requestItems)

    async function requestItems(url) {
        return asyncRequest(url+'/api/items')
    }
}
```


Same using Promise:
```javascript
function getItems(){
    var urls = getServiceUrls() // Returns array
    return coalesce(urls, requestItems)

    function requestItems(url) {
        return new Promise((resolve, reject) => {
            request(url+'/api/items',(error, body) => {
                if (error) reject(error)
                else resolve(body)
            })
        })

    }
}
```

With multiple parameters:
```javascript
function getItemInfo(id){
    var urls = getServiceUrls() // Returns array
    return coalesce(urls, (url) => requestItemInfo(url,id))

    async function requestItemInfo(url, id) {
        return asyncRequest(url+'/api/item/'+id)
    }
}
```

