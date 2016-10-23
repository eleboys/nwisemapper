(function () {
    var root = this;
    var NWiseFieldMapper = (function () {
        function NWiseFieldMapper() {
            this.converter = function (src) { return src; };
        }
        NWiseFieldMapper.prototype.getSourceField = function () { return this.sourceField; };
        NWiseFieldMapper.prototype.setSourceField = function (srcField) { this.sourceField = srcField; };
        NWiseFieldMapper.prototype.getTargetField = function () { return this.targetField; };
        NWiseFieldMapper.prototype.setTargetField = function (trgField) { this.targetField = trgField; };
        NWiseFieldMapper.prototype.getConverter = function () { return this.converter; };
        NWiseFieldMapper.prototype.setConverter = function (cnv) { this.converter = cnv; };
        NWiseFieldMapper.prototype.getIgnore = function () { return this.ignore; };
        NWiseFieldMapper.prototype.setIgnore = function (ignore) { this.ignore = ignore; };
        NWiseFieldMapper.prototype.getFirstRowOfSource = function () { return this.firstRowOfSource; };
        NWiseFieldMapper.prototype.takeFirstRowOfSource = function () { this.firstRowOfSource = true; };
        NWiseFieldMapper.prototype.getToFirstRowOfArray = function () { return this.toFirstRowOfArray; };
        NWiseFieldMapper.prototype.putToFirstRowOfArray = function () { this.toFirstRowOfArray = true; };
        return NWiseFieldMapper;
    }());
    var NWiseEntityMapperBuilder = (function () {
        function NWiseEntityMapperBuilder(config) {
            this.fieldMaps = [];
            this.configuration = config;
        }
        NWiseEntityMapperBuilder.prototype.forMember = function (srcM, tarM, conv) {
            var fieldMap = new NWiseFieldMapper();
            fieldMap.setSourceField(srcM);
            fieldMap.setTargetField(tarM);
            if (conv)
                fieldMap.setConverter(conv);
            this.fieldMaps.push(fieldMap);
            return fieldMap;
        };
        NWiseEntityMapperBuilder.prototype.forMemberUseMap = function (srcM, tarM, map, converter) {
            var _this = this;
            return this.forMember(srcM, tarM, function (src) {
                return _this.configuration.getConfiguarationBuilder()
                    .getNWiseMapper().map(map[0], map[1], converter ? converter(src) : src);
            });
        };
        NWiseEntityMapperBuilder.prototype.ignore = function () {
            var restOfMembers = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                restOfMembers[_i - 0] = arguments[_i];
            }
            for (var i = 0; i < restOfMembers.length; i++) {
                var fieldMap = new NWiseFieldMapper();
                fieldMap.setSourceField(restOfMembers[i]);
                fieldMap.setIgnore(true);
                this.fieldMaps.push(fieldMap);
            }
        };
        NWiseEntityMapperBuilder.prototype.ignoreOthers = function () {
            this.ignore('*');
        };
        NWiseEntityMapperBuilder.prototype.map = function (source) {
            if (!source)
                return source;
            var target = {};
            // retrieve ignore all configuration
            var hasIgnoreAll = this._filter(this.fieldMaps, function (fm) { return fm.getSourceField() === "*" && fm.getIgnore(); }).length > 0;
            for (var member in source) {
                var fieldMaps = this._filter(this.fieldMaps, function (fm) { return fm.getSourceField() === member; });
                // if no mapping strategy is defined for the field
                if (fieldMaps.length == 0) {
                    // if must not ignore all field that dont have mapping
                    if (!hasIgnoreAll) {
                        target[member] = source[member];
                    }
                }
                fieldMaps.forEach(function (fieldMap) {
                    // if field is requested to be ingnored do nothing
                    if (fieldMap.getIgnore()) {
                    }
                    else {
                        // get value of sourceField with convert strategy
                        var value = fieldMap.getConverter()(source[member]);
                        // if is configed to take just the first row of source
                        if (fieldMap.getFirstRowOfSource()) {
                            // so the source converted value must be an array
                            if (Array.isArray(value)) {
                                target[fieldMap.getTargetField()] = value.length ? value[0] : undefined;
                            }
                            else {
                                throw "taking first row of source works for array value (" + member + ")";
                            }
                        }
                        else {
                            // if is configed to put source value as an first index of an array
                            if (fieldMap.getToFirstRowOfArray()) {
                                target[fieldMap.getTargetField()] = [value];
                            }
                            else {
                                target[fieldMap.getTargetField()] = value;
                            }
                        }
                    }
                });
            }
            return target;
        };
        NWiseEntityMapperBuilder.prototype.mapArray = function (sources) {
            var _this = this;
            return sources.map(function (src) { return _this.map(src); });
        };
        NWiseEntityMapperBuilder.prototype._filter = function (arraay, filterCallback) {
            var result = [];
            for (var i = 0; i < arraay.length; i++) {
                if (filterCallback(arraay[i])) {
                    result.push(arraay[i]);
                }
            }
            return result;
        };
        return NWiseEntityMapperBuilder;
    }());
    var NWiseConfiguration = (function () {
        function NWiseConfiguration(source, target, entityMapperBuilderCallback, builder) {
            this.sourceType = source;
            this.targetType = target;
            this.entityMapperBuilder = new NWiseEntityMapperBuilder(this);
            this.builder = builder;
            entityMapperBuilderCallback(this.entityMapperBuilder);
        }
        NWiseConfiguration.prototype.getSourceType = function () {
            return this.sourceType;
        };
        NWiseConfiguration.prototype.getTargetType = function () {
            return this.targetType;
        };
        NWiseConfiguration.prototype.getEntityMapperBuilder = function () {
            return this.entityMapperBuilder;
        };
        NWiseConfiguration.prototype.getConfiguarationBuilder = function () { return this.builder; };
        return NWiseConfiguration;
    }());
    var NWiseConfigurationBuilder = (function () {
        function NWiseConfigurationBuilder(nwMapper) {
            this.configs = [];
            this.nwMapper = nwMapper;
        }
        NWiseConfigurationBuilder.prototype.createMap = function (source, target, callback) {
            this.configs.push(new NWiseConfiguration(source, target, callback, this));
            return this;
        };
        NWiseConfigurationBuilder.prototype.find = function (source, target) {
            for (var i = 0; i < this.configs.length; i++) {
                if (this.configs[i].getSourceType() == source && this.configs[i].getTargetType() == target) {
                    return this.configs[i];
                }
            }
            return null;
        };
        NWiseConfigurationBuilder.prototype.getNWiseMapper = function () { return this.nwMapper; };
        return NWiseConfigurationBuilder;
    }());
    var NWiseMapper = (function () {
        function NWiseMapper() {
            this.configBuilder = new NWiseConfigurationBuilder(this);
        }
        NWiseMapper.prototype.initialize = function (cnfgCallback) {
            cnfgCallback(this.configBuilder);
            return this;
        };
        NWiseMapper.prototype.map = function (sourceType, targetType, source) {
            var mapCnfg = this.configBuilder.find(sourceType, targetType);
            if (mapCnfg == null) {
                throw "no configuration is defined to map " + sourceType + " to " + targetType;
            }
            var entityMapper = mapCnfg.getEntityMapperBuilder();
            if (Array.isArray(source))
                return entityMapper.mapArray(source);
            else
                return entityMapper.map(source);
        };
        return NWiseMapper;
    }());
    if (typeof module !== 'undefined') {
        exports = module.exports = new NWiseMapper();
    }
    else {
        root.nwmapper = new NWiseMapper();
    }
}).call(this);
