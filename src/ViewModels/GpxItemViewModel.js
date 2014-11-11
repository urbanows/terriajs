'use strict';

/*global require,Document,$,toGeoJSON*/

var defaultValue = require('../../third_party/cesium/Source/Core/defaultValue');
var defined = require('../../third_party/cesium/Source/Core/defined');
var defineProperties = require('../../third_party/cesium/Source/Core/defineProperties');
var DeveloperError = require('../../third_party/cesium/Source/Core/DeveloperError');
var knockout = require('../../third_party/cesium/Source/ThirdParty/knockout');
var loadXML = require('../../third_party/cesium/Source/Core/loadXML');
var Rectangle = require('../../third_party/cesium/Source/Core/Rectangle');
var when = require('../../third_party/cesium/Source/ThirdParty/when');

var corsProxy = require('../Core/corsProxy');
var MetadataViewModel = require('./MetadataViewModel');
var MetadataItemViewModel = require('./MetadataItemViewModel');
var ViewModelError = require('./ViewModelError');
var CatalogItemViewModel = require('./CatalogItemViewModel');
var inherit = require('../Core/inherit');
var readXml = require('../Core/readXml');
var runLater = require('../Core/runLater');

var GeoJsonItemViewModel = require('./GeoJsonItemViewModel');
var readText = require('../Core/readText');
var loadText = require('../../third_party/cesium/Source/Core/loadText');


/**
 * A {@link CatalogItemViewModel} representing GPX data.
 *
 * @alias GpxItemViewModel
 * @constructor
 * @extends GeoJsonItemViewModel
 * 
 * @param {ApplicationViewModel} application The application.
 * @param {String} [url] The URL from which to retrieve the GPX data.
 */
var GpxItemViewModel = function(application, url) {
    CatalogItemViewModel.call(this, application);

    this._geoJsonViewModel = undefined;
    this._loadedUrl = undefined;
    this._loadedData = undefined;
    this._loadingPromise = undefined;

    /**
     * Gets or sets the URL from which to retrieve GPX data.  This property is ignored if
     * {@link GpxItemViewModel#data} is defined.  This property is observable.
     * @type {String}
     */
    this.url = url;

    /**
     * Gets or sets the Gpx data, represented as a binary Blob, DOM Document, or a Promise for one of those things.
     * This property is observable.
     * @type {Blob|Document|Promise}
     */
    this.data = undefined;

    /**
     * Gets or sets the URL from which the {@link GpxItemViewModel#data} was obtained.  This may be used
     * to resolve any resources linked in the Gpx file, if any.
     * @type {String}
     */
    this.dataSourceUrl = undefined;

    knockout.track(this, ['url', 'data', 'dataSourceUrl']);
};

inherit(CatalogItemViewModel, GpxItemViewModel);

defineProperties(GpxItemViewModel.prototype, {
    /**
     * Gets the type of data member represented by this instance.
     * @memberOf GpxItemViewModel.prototype
     * @type {String}
     */
    type : {
        get : function() {
            return 'gpx';
        }
    },

    /**
     * Gets a human-readable name for this type of data source, 'GPX'.
     * @memberOf GpxItemViewModel.prototype
     * @type {String}
     */
    typeName : {
        get : function() {
            return 'GPX';
        }
    },

    /**
     * Gets the metadata associated with this data source and the server that provided it, if applicable.
     * @memberOf GpxItemViewModel.prototype
     * @type {MetadataViewModel}
     */
    metadata : {
        get : function() {
            var result = new MetadataViewModel();
            result.isLoading = false;
            result.dataSourceErrorMessage = 'This data source does not have any details available.';
            result.serviceErrorMessage = 'This service does not have any details available.';
            return result;
        }
    }
});

/**
 * Processes the Gpx data supplied via the {@link GpxItemViewModel#data} property.  If
 * {@link GpxItemViewModel#data} is undefined, this method downloads GPX data from 
 * {@link GpxItemViewModel#url} and processes that.  It is safe to call this method multiple times.
 * It is called automatically when the data source is enabled.
 */
GpxItemViewModel.prototype.load = function() {
    if ((this.url === this._loadedUrl && this.data === this._loadedData) || this.isLoading === true) {
        return;
    }

    this.isLoading = true;
    this._geoJsonViewModel = new GeoJsonItemViewModel(this.application);

    var that = this;
    this._loadingPromise = runLater(function() {
        that._loadedUrl = that.url;
        that._loadedData = that.data;

        if (defined(that.data)) {
            when(that.data, function(data) {
                var promise;
                if (data instanceof Blob) {
                    promise = readText(data);
                } else {
                    promise = data;
                }

                when(promise, function(text) {
                    loadGpxText(that, text);
                });
            });
        } else {
            loadText(proxyUrl(that, that.url)).then(function(text) {
                loadGpxText(that, text);
            }).otherwise(function() {
                errorLoading(that);
            });
        }
    });
    return this._loadingPromise;
};

GpxItemViewModel.prototype._enable = function() {
    if (defined(this._geoJsonViewModel)) {
        this._geoJsonViewModel._enable();
    }
};

GpxItemViewModel.prototype._disable = function() {
    if (defined(this._geoJsonViewModel)) {
        this._geoJsonViewModel._disable();
    }
};

GpxItemViewModel.prototype._show = function() {
    if (defined(this._geoJsonViewModel)) {
        this._geoJsonViewModel._show();
    }
};

GpxItemViewModel.prototype._hide = function() {
    if (defined(this._geoJsonViewModel)) {
        this._geoJsonViewModel._hide();
    }
};


function proxyUrl(application, url) {
    if (defined(application.corsProxy) && application.corsProxy.shouldUseProxy(url)) {
        return application.corsProxy.getURL(url);
    }

    return url;
}

function loadGpxText(viewModel, text) {

    var dom = (new DOMParser()).parseFromString(text, 'text/xml');    
    var geojson = toGeoJSON.gpx(dom);

    viewModel._geoJsonViewModel.data = geojson;

    var subscription = knockout.getObservable(viewModel._geoJsonViewModel, 'isLoading').subscribe(function(newValue) {
        if (newValue === false) {
            subscription.dispose();
            viewModel.rectangle = viewModel._geoJsonViewModel.rectangle;
            viewModel.isLoading = false;
            viewModel._loadingPromise = undefined;
        }
    });

    viewModel._geoJsonViewModel.load();
}

function errorLoading(viewModel) {
    viewModel.application.error.raiseEvent(new ViewModelError({
        sender: viewModel,
        title: 'Error loading GPX',
        message: '\
An error occurred while loading a GPX file.  This may indicate that the file is invalid or that it \
is not supported by National Map.  If you would like assistance or further information, please email us \
at <a href="mailto:nationalmap@lists.nicta.com.au">nationalmap@lists.nicta.com.au</a>.'
    }));

    viewModel._loadedUrl = undefined;
    viewModel._loadedData = undefined;
    viewModel.isEnabled = false;
    viewModel.isLoading = false;
    viewModel._geoJsonViewModel = undefined;
    viewModel._loadingPromise = undefined;
}

module.exports = GpxItemViewModel;
