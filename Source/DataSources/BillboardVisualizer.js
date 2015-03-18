/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/NearFarScalar',
        '../Scene/BillboardCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/VerticalOrigin',
        './Property'
    ], function(
        AssociativeArray,
        Cartesian2,
        Cartesian3,
        Color,
        defined,
        destroyObject,
        DeveloperError,
        NearFarScalar,
        BillboardCollection,
        HorizontalOrigin,
        VerticalOrigin,
        Property) {
    "use strict";

    var defaultColor = Color.WHITE;
    var defaultEyeOffset = Cartesian3.ZERO;
    var defaultPixelOffset = Cartesian2.ZERO;
    var defaultScale = 1.0;
    var defaultRotation = 0.0;
    var defaultAlignedAxis = Cartesian3.ZERO;
    var defaultHorizontalOrigin = HorizontalOrigin.CENTER;
    var defaultVerticalOrigin = VerticalOrigin.CENTER;

    var position = new Cartesian3();
    var color = new Color();
    var eyeOffset = new Cartesian3();
    var pixelOffset = new Cartesian2();
    var scaleByDistance = new NearFarScalar();
    var translucencyByDistance = new NearFarScalar();
    var pixelOffsetScaleByDistance = new NearFarScalar();

    var EntityData = function(entity) {
        this.entity = entity;
        this.billboard = undefined;
    };

    /**
     * A {@link Visualizer} which maps {@link Entity#billboard} to a {@link Billboard}.
     * @alias BillboardVisualizer
     * @constructor
     *
     * @param {Scene} primitiveCollection The parent the primitives will be added in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    var BillboardVisualizer = function(primitiveCollection, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(primitiveCollection)) {
            throw new DeveloperError('primitiveCollection is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(BillboardVisualizer.prototype._onCollectionChanged, this);

        this._primitiveCollection = primitiveCollection;
        this._unusedIndexes = [];
        this._billboardCollection = undefined;
        this._entityCollection = entityCollection;
        this._items = new AssociativeArray();

        this._propertyName = defined(propertyName)?propertyName:"_billboard";

        this._onCollectionChanged(entityCollection, entityCollection.entities, [], []);
    };

    /**
     * Updates the primitives created by this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    BillboardVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var items = this._items.values;
        var unusedIndexes = this._unusedIndexes;

        var propertyName = this._propertyName;

        for (var i = 0, len = items.length; i < len; i++) {
            var item = items[i];
            var entity = item.entity;
            var billboardGraphics = entity[propertyName];
            var textureValue;
            var billboard = item.billboard;
            var show = entity.isAvailable(time) && Property.getValueOrDefault(billboardGraphics._show, time, true);

            if (show) {
                position = Property.getValueOrUndefined(entity._position, time, position);
                textureValue = Property.getValueOrUndefined(billboardGraphics._image, time);
                show = defined(position) && defined(textureValue);
            }

            if (!show) {
                //don't bother creating or updating anything else
                returnBillboard(item, unusedIndexes);
                continue;
            }

            if (!defined(billboard)) {
                var billboardCollection = this._billboardCollection;
                if (!defined(billboardCollection)) {
                    billboardCollection = new BillboardCollection();
                    this._billboardCollection = billboardCollection;
                    this._primitiveCollection.add(billboardCollection);
                }

                var length = unusedIndexes.length;
                if (length > 0) {
                    billboard = billboardCollection.get(unusedIndexes.pop());
                } else {
                    billboard = billboardCollection.add();
                }

                billboard.id = entity;
                billboard.image = undefined;
                item.billboard = billboard;
            }

            billboard.show = show;
            billboard.image = textureValue;
            billboard.position = position;
            billboard.color = Property.getValueOrDefault(billboardGraphics._color, time, defaultColor, color);
            billboard.eyeOffset = Property.getValueOrDefault(billboardGraphics._eyeOffset, time, defaultEyeOffset, eyeOffset);
            billboard.pixelOffset = Property.getValueOrDefault(billboardGraphics._pixelOffset, time, defaultPixelOffset, pixelOffset);
            billboard.scale = Property.getValueOrDefault(billboardGraphics._scale, time, defaultScale);
            billboard.rotation = Property.getValueOrDefault(billboardGraphics._rotation, time, defaultRotation);
            billboard.alignedAxis = Property.getValueOrDefault(billboardGraphics._alignedAxis, time, defaultAlignedAxis);
            billboard.horizontalOrigin = Property.getValueOrDefault(billboardGraphics._horizontalOrigin, time, defaultHorizontalOrigin);
            billboard.verticalOrigin = Property.getValueOrDefault(billboardGraphics._verticalOrigin, time, defaultVerticalOrigin);
            billboard.width = Property.getValueOrUndefined(billboardGraphics._width, time);
            billboard.height = Property.getValueOrUndefined(billboardGraphics._height, time);
            billboard.scaleByDistance = Property.getValueOrUndefined(billboardGraphics._scaleByDistance, time, scaleByDistance);
            billboard.translucencyByDistance = Property.getValueOrUndefined(billboardGraphics._translucencyByDistance, time, translucencyByDistance);
            billboard.pixelOffsetScaleByDistance = Property.getValueOrUndefined(billboardGraphics._pixelOffsetScaleByDistance, time, pixelOffsetScaleByDistance);
        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    BillboardVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    BillboardVisualizer.prototype.destroy = function() {
        this._entityCollection.collectionChanged.removeEventListener(BillboardVisualizer.prototype._onCollectionChanged, this);
        if (defined(this._billboardCollection)) {
            this._primitiveCollection.remove(this._billboardCollection);
        }
        return destroyObject(this);
    };

    BillboardVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var unusedIndexes = this._unusedIndexes;
        var items = this._items;
        var propertyName = this._propertyName;
        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity[propertyName]) && defined(entity._position)) {
                items.set(entity.id, new EntityData(entity));
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity[propertyName]) && defined(entity._position)) {
                if (!items.contains(entity.id)) {
                    items.set(entity.id, new EntityData(entity));
                }
            } else {
                returnBillboard(items.get(entity.id), unusedIndexes);
                items.remove(entity.id);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            returnBillboard(items.get(entity.id), unusedIndexes);
            items.remove(entity.id);
        }
    };

    function returnBillboard(item, unusedIndexes) {
        if (defined(item)) {
            var billboard = item.billboard;
            if (defined(billboard)) {
                item.billboard = undefined;
                billboard.show = false;
                billboard.image = undefined;
                unusedIndexes.push(billboard._index);
            }
        }
    }

    return BillboardVisualizer;
});
