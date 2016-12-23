/*global define*/
define([
        '../ThirdParty/when',
        './defaultValue',
        './defined',
        './DeveloperError',
        './isCrossOriginUrl'
    ], function(
        when,
        defaultValue,
        defined,
        DeveloperError,
        isCrossOriginUrl) {
    "use strict";

    var dataUriRegex = /^data:/;

    /**
     * Asynchronously loads the given image URL.  Returns a promise that will resolve to
     * an {@link Image} once loaded, or reject if the image failed to load.
     *
     * @exports loadImage
     *
     * @param {String|Promise} url The source of the image, or a promise for the URL.
     * @param {Object} [options] options to send with the requests.
     * @param {Boolean} [allowCrossOrigin=true] Whether to request the image using Cross-Origin
     *        Resource Sharing (CORS).  CORS is only actually used if the image URL is actually cross-origin.
     *        Data URIs are never requested using CORS.
     * @returns {Promise} a promise that will resolve to the requested data when loaded.
     *
     *
     * @example
     * // load a single image asynchronously
     * Cesium.loadImage('some/image/url.png').then(function(image) {
     *     // use the loaded image
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * // load several images in parallel
     * when.all([loadImage('image1.png'), loadImage('image2.png')]).then(function(images) {
     *     // images is an array containing all the loaded images
     * });
     *
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */
    function loadImage(url, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var allowCrossOrigin = defaultValue(options.allowCrossOrigin, true);
        var useCredentials = defaultValue(options.withCredentials, false);

        return when(url, function(url) {
            var crossOrigin;

            // data URIs can't have allowCrossOrigin set.
            if (!dataUriRegex.test(url) && allowCrossOrigin && useCredentials !== true) {
                allowCrossOrigin = isCrossOriginUrl(url);
            }

            var deferred = when.defer();

            if (allowCrossOrigin){
                if (useCredentials) {
                    crossOrigin = 'use-credentials';
                }else{
                    crossOrigin = '';
                }
            }

            loadImage.createImage(url, crossOrigin, deferred);

            return deferred.promise;
        });
    }

    // This is broken out into a separate function so that it can be mocked for testing purposes.
    loadImage.createImage = function(url, crossOrigin, deferred) {
        var image = new Image();

        image.onload = function() {
            deferred.resolve(image);
        };

        image.onerror = function(e) {
            deferred.reject(e);
        };

        image.crossOrigin = crossOrigin;

        image.src = url;
    };

    loadImage.defaultCreateImage = loadImage.createImage;

    return loadImage;
});
