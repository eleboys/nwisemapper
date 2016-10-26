
(function() {

	let root = this;

	class NWiseFieldMapper {
		private sourceField: string;
		private targetField: string;
		private converter: (src: any) => any = (src: any) => src;
		private ignore: boolean;
		private firstRowOfSource: boolean;
		private toFirstRowOfArray: boolean;

		public getSourceField(): string { return this.sourceField; }
		public setSourceField(srcField: string) { this.sourceField = srcField; }

		public getTargetField(): string { return this.targetField; }
		public setTargetField(trgField: string) { this.targetField = trgField; }

		public getConverter(): (src: any) => any { return this.converter; }
		public setConverter(cnv: (src: any) => any) { this.converter = cnv; }

		public getIgnore(): boolean { return this.ignore; }
		public setIgnore(ignore: boolean) { this.ignore = ignore; }

		public getFirstRowOfSource(): boolean { return this.firstRowOfSource; }
		public takeFirstRowOfSource() { this.firstRowOfSource = true; }

		public getToFirstRowOfArray(): boolean { return this.toFirstRowOfArray; }
		public putToFirstRowOfArray() { this.toFirstRowOfArray = true; }
	}

	class NWiseEntityMapperBuilder {
		private fieldMaps: NWiseFieldMapper[] = [];
		private configuration: NWiseConfiguration;

		constructor(config: NWiseConfiguration) {
			this.configuration = config;
		}

		public forMember(srcM: string, tarM: string, conv?: (src: any) => any) : NWiseFieldMapper {
			var fieldMap = new NWiseFieldMapper();
			fieldMap.setSourceField(srcM);
			fieldMap.setTargetField(tarM);
			if (conv)
				fieldMap.setConverter(conv);
			this.fieldMaps.push(fieldMap);
			return fieldMap;
		}

		public forMemberUseMap(srcM: string, tarM: string, map: [string, string], converter?: (src: any) => any): NWiseFieldMapper {
			return this.forMember(srcM, tarM, (src) => {
				return this.configuration.getConfiguarationBuilder()
					.getNWiseMapper().map(map[0], map[1], converter ? converter(src): src);
			})
		}

		public ignore(...restOfMembers: string[]) {
			for (var i = 0; i < restOfMembers.length; i++) {
				var fieldMap = new NWiseFieldMapper();
				fieldMap.setSourceField(restOfMembers[i]);
				fieldMap.setIgnore(true);
				this.fieldMaps.push(fieldMap);
			}
		}

		public ignoreOthers() {
			this.ignore('*');
		}

		public map(source: any): any {
			if (!source)
				return source;
			var target = {};
			// retrieve ignore all configuration
			var hasIgnoreAll = this._filter(this.fieldMaps, fm =>fm.getSourceField() === "*" && fm.getIgnore()).length>0;
			for (var member in source) {
				var fieldMaps = this._filter(this.fieldMaps, fm => fm.getSourceField() === member);
				// if no mapping strategy is defined for the field
				if (fieldMaps.length==0) {
					// if must not ignore all field that dont have mapping
					if (!hasIgnoreAll) {
						target[member] = source[member];
					}
				}
				fieldMaps.forEach(function (fieldMap) {
					// if field is requested to be ingnored do nothing
					if (fieldMap.getIgnore()) {

					} else {
						// get value of sourceField with convert strategy
						var value = fieldMap.getConverter()(source[member], source);
						// if is configed to take just the first row of source
						if (fieldMap.getFirstRowOfSource()) {
							// so the source converted value must be an array
							if (Array.isArray(value)) {
								target[fieldMap.getTargetField()] = value.length ? value[0] : undefined;
							} else {
								throw `taking first row of source works for array value (${member})`;
							}
						} else {
							// if is configed to put source value as an first index of an array
							if (fieldMap.getToFirstRowOfArray()) {
								target[fieldMap.getTargetField()] = [value];
								// else put the value for the target
							} else {
								target[fieldMap.getTargetField()] = value;
							}
						}
					}
				});
			}

			return target;
		}

		public mapArray(sources: any[]): any {
			return sources.map(src => this.map(src));
		}

		private _filter(arraay : any[], filterCallback: (item:any)=>boolean){
			let result = [];
			for (var i = 0; i<arraay.length; i++){
				if (filterCallback(arraay[i])){
					result.push(arraay[i]);
				}
			}
			return result;
		}
	}

	class NWiseConfiguration {
		private sourceType: string;
		private targetType: string;
		private entityMapperBuilder: NWiseEntityMapperBuilder;
		private builder: NWiseConfigurationBuilder;

		constructor(source: string, target: string,
			entityMapperBuilderCallback: (fmbcnfg: any) => any,
			builder: NWiseConfigurationBuilder) {
			this.sourceType = source;
			this.targetType = target;
			this.entityMapperBuilder = new NWiseEntityMapperBuilder(this);
			this.builder = builder;
			entityMapperBuilderCallback(this.entityMapperBuilder);
		}

		public getSourceType(): string {
			return this.sourceType;
		}
		public getTargetType(): string {
			return this.targetType;
		}
		public getEntityMapperBuilder(): NWiseEntityMapperBuilder {
			return this.entityMapperBuilder;
		}

		public getConfiguarationBuilder(): NWiseConfigurationBuilder { return this.builder; }
	}

	class NWiseConfigurationBuilder {
		private nwMapper: NWiseMapper;
		private configs: NWiseConfiguration[] = [];

		constructor(nwMapper: NWiseMapper) {
			this.nwMapper = nwMapper;
		}

		public createMap(source: string, target: string, callback: (entityMapperBuilder: NWiseEntityMapperBuilder) => any): NWiseConfigurationBuilder {
			this.configs.push(new NWiseConfiguration(source, target, callback, this));
			return this;
		}

		public find(source: string, target: string): NWiseConfiguration {
			for (var i = 0; i < this.configs.length; i++) {
				if (this.configs[i].getSourceType() == source && this.configs[i].getTargetType() == target) {
					return this.configs[i];
				}
			}
			return null;
		}

		public getNWiseMapper(): NWiseMapper { return this.nwMapper; }
	}

	class NWiseMapper {
		private configBuilder: NWiseConfigurationBuilder;

		constructor() {
			this.configBuilder = new NWiseConfigurationBuilder(this);
		}

		public initialize(cnfgCallback: (cnfg: NWiseConfigurationBuilder) => any): NWiseMapper {
			cnfgCallback(this.configBuilder);
			return this;
		}

		public map(sourceType: string, targetType: string, source: any): any {
			var mapCnfg = this.configBuilder.find(sourceType, targetType);
			if (mapCnfg == null) {
				throw `no configuration is defined to map ${sourceType} to ${targetType}`;
			}

			var entityMapper = mapCnfg.getEntityMapperBuilder();
			if (Array.isArray(source))
				return entityMapper.mapArray(source);
			else
				return entityMapper.map(source);
		}
	}

    if (typeof module !== 'undefined') {
		exports = module.exports = new NWiseMapper();
    } else {
        root.nwmapper = new NWiseMapper();
    }

}).call(this);