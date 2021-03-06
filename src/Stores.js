/* global jQuery */

import { CookieStorage } from './CookieStorage'
import { WebStorage } from './WebStorage'
import { defaults } from './defaults'

const $ = jQuery

function prefixArray (prefix, arr) {
  for (var i = 0, j = arr.length; i < j; i++) {
    arr[i] = prefix + ':' + arr[i]
  }
}

function getStorage (storageName) {
  if (['sessionStorage', 'localStorage'].indexOf(storageName) < 0) {
    return null
  }
  var storage
  try {
    // when blocking 3rd party cookies trying to access the existing storage
    // will throw an exception
    // see https://bugs.chromium.org/p/chromium/issues/detail?id=357625
    storage = window[storageName]
  }
  catch (e) {
    return null
  }
  return storage
}

class Stores {
  static fromSettings (settings) {
    settings = $.extend({}, defaults, settings)
    const stores = $.extend(true, [], settings.stores)
    if (settings.useSessionStore) {
      const _sessionStorage = getStorage('sessionStorage')
      if (_sessionStorage) {
        const s = new WebStorage(_sessionStorage, settings.prefix)
        if (s.browserSupport()) {
          stores.push(s)
        }
      }
    }
    if (settings.useLocalStore) {
      const _localStorage = getStorage('localStorage')
      if (_localStorage) {
        const s = new WebStorage(_localStorage, settings.prefix)
        if (s.browserSupport()) {
          stores.push(s)
        }
      }
    }
    if (settings.useCookies) {
      stores.push(new CookieStorage(settings.prefix, settings.cookieDomain, settings.cookieMaxAge))
    }
    return new this(stores, settings.stringPrefix, settings.listPrefix)
  }

  constructor (stores, stringPrefix, listPrefix) {
    this.stores = stores
    this.stringPrefix = stringPrefix
    this.listPrefix = listPrefix
  }

  setItems (keys, value) {
    const promises = []
    this.stores.forEach(function (store, index) {
      promises.push(store.setItems(keys, value))
    })
    return Promise.all(promises)
  }

  removeItems (keys) {
    const promises = []
    this.stores.forEach(function (store, index) {
      promises.push(store.removeItems(keys))
    })
    return Promise.all(promises)
  }

  getFirst (keys) {
    // This could use Promise.any() once it is standardized.
    var promisesRejected = 0
    return new Promise((resolve, reject) => {
      this.stores.forEach((store, index) => {
        store.getFirst(keys).then((value) => {
          resolve(value)
        }, (cause) => {
          // Reject only when all of the stores have rejected.
          if (++promisesRejected === this.stores.length) {
            reject(cause)
          }
        })
      })
    })
  }

  prefix (keys, list = false) {
    prefixArray(list ? this.listPrefix : this.stringPrefix, keys)
    return keys
  }

  setValuesMap (vars) {
    var promises = []
    Object.keys(vars).forEach((key) => {
      const values = vars[key]
      promises.push(this.setItems(this.prefix([key]), values[values.length - 1]))
      promises.push(this.setItems(this.prefix([key], true), values))
    })
    return Promise.all(promises)
  }
}

export { Stores }
