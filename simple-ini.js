var SimpleIni = (function () {
    
    // Define trim, trimLeft and trimRight to support different browsers
    // e.g. trimLeft is not defined in IE 10.
    if (typeof String.prototype.trim === 'undefined') {
        String.prototype.trim = function() {
            return this.replace(/^\s+|\s+$/g,"");
        }
    }
    
    if (typeof String.prototype.trimLeft === 'undefined') {
        String.prototype.trimLeft = function() {
            return this.replace(/^\s+/,"");
        }
    }
    
    if (typeof String.prototype.trimRight === 'undefined') {
        String.prototype.trimRight = function() {
            return this.replace(/\s+$/,"");
        }
    }
    
    var pick = function (arg, defaultValue) {
        return typeof arg === 'undefined' ? defaultValue : arg;
    }

    var processOptions = function (options) {
        options = options || {};
        options.caseSensitive = pick(options.caseSensitive, false);
        options.comments = options.comments || [';'];
        options.throwOnDuplicate = pick(options.throwOnDuplicate, true);
        options.allowGlobalProperties = pick(options.allowGlobalProperties, true);
        options.delimiter = options.delimiter || '=';
        options.quotedValues = pick(options.quotedValues, false);
        options.ignoreWhitespace = pick(options.ignoreWhitespace, false);
        options.lineSeparator = options.lineSeparator || '\n';
        return options;
    };

    var isFunction = function(func) {
        var getClass = {}.toString;
        return func && getClass.call(func) == '[object Function]';
    };

    var findProperty = function(obj, property, isIgnoreCase) {
        var checkedName;
        var allProperties = Object.getOwnPropertyNames(obj);
        property = isIgnoreCase ? property.toLowerCase() : property;
        
        for (var i = 0; i < allProperties.length; ++i) {
            checkedName = isIgnoreCase ? allProperties[i].toLowerCase() : allProperties[i];
            
            if (checkedName === property) {
                return allProperties[i];
            }
        }
        
        return null;
    };

    var addSection = function(obj, section) {
        Object.defineProperty(
            obj, 
            section,
            {
                value: {},
                configurable: true,
                enumerable: true
            });
    };

    var addProperty = function(obj, property, value, section) {
        var foundSection;
		value = value.replace(/\s+/g, ' ').trim();
        
        if (!section) {
            Object.defineProperty(
                obj, 
                property,
                {
                    value: value,
                    configurable: true,
                    enumerable: true
                });
        }
        else {
            if (findProperty(obj, section, false) === null) {
                addSection(obj, section);
            }
            
            Object.defineProperty(
                obj[section], 
                property,
                {
                    value: value,
                    configurable: true,
                    enumerable: true
                });
        }
    }

    return function(loadFunction, options) {
        var self = this;
        
        var finalOptions,
            content, 
            sectionName,
            realSectionName,
            isParameter, 
            isSection, 
            baseLine,
            line,
            comment,
            property,
            value,
            str, i, j, position;
            
        finalOptions = processOptions(options);
        
        finalOptions.format = function(key, value) {
            var line;
            line = key + this.delimiter;
            line += this.quotedValues ? line += '"' + value + '"' : value;
            return line;
        }
        
        finalOptions.cleanComments = function(str) {
            var minPosition,
                position,
                i;
                
            minPosition = -1;
            for (i = 0; i < this.comments.length; ++i) {
                position = str.indexOf(this.comments[i]);
                if (position > -1 &&
                    (minPosition === -1 || 
                        (minPosition !== -1 && position < minPosition))) {
                    minPosition = position;
                }
            }
            
            return minPosition > -1 ? str.substr(0, minPosition) : str;
        }

        
        // *******************************************************************
        // Methods
        // *******************************************************************
        
        Object.defineProperty(
            this, 
            "save",
            {
                value: function(saveFunction) {
                    var content,
                        section,
                        property,
                        value;
                    
                    if (!isFunction(saveFunction)) {
                        throw new Error('You should provide a function which persits the data');
                    }
                    
                    content = [];
                    for (section in self) {
                        value = self[section];
                        if (typeof value === 'string' ||
                            typeof value === 'number' ||
                            typeof value === 'boolean') {
                            if (finalOptions.allowGlobalProperties) {
                                content.push(finalOptions.format(section, value));
                            }
                            else {
                                throw new Error("Global properties are disabled.");
                            }
                        }
                        else {
                            content.push('[' + section + ']');
                            for (property in self[section]) {
                                content.push(finalOptions.format(property, self[section][property]));
                            }
                        }
                    }
                    
                    saveFunction(content.join(finalOptions.lineSeparator));
                }
            });
            
        Object.defineProperty(
            this, 
            "hasSection",
            {
                value: function(section) {
                    var isIgnoreCase = !finalOptions.caseSensitive;
                    return findProperty(self, section, isIgnoreCase) !== null;
                }
            });
            
        Object.defineProperty(
            this, 
            "hasProperty",
            {
                value: function(property, section) {
                    var isIgnoreCase,
                        sectionName;
                
                    isIgnoreCase = !finalOptions.caseSensitive;
                    if (!section) {
                        // Global properties 
                        if (!finalOptions.allowGlobalProperties) {
                            throw new Error("Global properties are disabled.");
                        }
                        
                        return findProperty(self, property, isIgnoreCase) !== null;
                    }
                    else {
                        sectionName = findProperty(self, section, isIgnoreCase);
                        return sectionName === null ? false : findProperty(self[sectionName], property, isIgnoreCase) !== null
                    }
                }
            });
            
        Object.defineProperty(
            this, 
            "get",
            {
                value: function(config) {
                    var section,
                        property,
                        isIgnoreCase,
                        delimiter;
                        
                    isIgnoreCase = !finalOptions.caseSensitive; 
                    delimiter = config.indexOf('.');
                    if (delimiter > -1) {
                        section = config.substr(0, delimiter);
                        property = config.substr(delimiter + 1);
                        
                        section = findProperty(self, section, isIgnoreCase);
                        if (section !== null) {
                            property = findProperty(self[section], property, isIgnoreCase);
                            return property === null ? property : self[section][property];
                        }
                    }
                    else {
                        section = findProperty(self, config, isIgnoreCase);
                        if (section != null) {
                            property = self[section];
                            if (!finalOptions.allowGlobalProperties ||
                                (finalOptions.allowGlobalProperties && 
                                    (typeof property === 'string' || 
                                     typeof property === 'number' || 
                                     typeof property === 'boolean'))) {
                                return property;
                            }
                        }
                    }
                    
                    return null;
                }
            });
        
        
        // *******************************************************************
        // Parse an ini-file
        // *******************************************************************   
        
        if (!isFunction(loadFunction)) {
            return;
        }
        
        content = loadFunction().split(finalOptions.lineSeparator);
        
        sectionName = null;
        
    next_line:
        for (i = 0; i < content.length; ++i) {
            baseLine = finalOptions.cleanComments(content[i]);
            line = baseLine.trim();
            
            // Check for blanks
            
            if (line === "") {
                continue;       
            }
            
            // Check for sections
            
            isSection = line.length > 2 && 
                        line.charAt(0) === '[' && 
                        line.charAt(line.length - 1) === ']';
            if (isSection) {
                sectionName = line.substring(1, line.length - 1);
                realSectionName = findProperty(this, sectionName, !finalOptions.caseSensitive);
                if (realSectionName !== null) {
                    if (finalOptions.throwOnDuplicate) {
                        throw new Error('Duplicate section name at line ' + (i + 1) + '. Text: "' + line + '".');
                    }
                    
                    sectionName = realSectionName;
                }
                else {
                    addSection(this, sectionName);
                }
                
                continue;
            }
            
            // Check for parameters

            isParameter = line.indexOf(finalOptions.delimiter);
            if (isParameter > -1) {
                property = baseLine.substr(0, isParameter);
                value = baseLine.substr(isParameter + 1);
                
                // Line continuation: \ and the EOL (end-of-line)
                while (i < content.length && value.charAt(value.length - 1) === '\\') {
                    value = value.substr(0, value.length - 1);
                    baseLine = content[++i].trimLeft();
                    baseLine = finalOptions.cleanComments(baseLine);
                    value += baseLine;
                }
                
                
                // Process quoted values
                if (finalOptions.quotedValues) {
                    if (value.length > 2 && 
                        ((value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") ||
                            (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"'))) {
                        value = value.substring(1, value.length - 1);
                    }
                }
                
                // Process whitespace
                if (finalOptions.ignoreWhitespace) {
                    value = value.trim();
                }
                
                // Check for duplicates
                if (this.hasProperty(property, sectionName)) {
                    if (finalOptions.throwOnDuplicate) {
                        throw new Error('Duplicate property at line ' + (i + 1) + '. Text: "' + line + '".');
                    }
                    else {
                        continue;
                    }
                }
                
                // Check for global properties
                if (sectionName === null && !finalOptions.allowGlobalProperties) {
                    throw new Error('Global properties are not allowed. Line: ' + (i + 1) + '. Text: "' + line + '".');
                }
                
                addProperty(this, property, value, sectionName);
                continue;
            }
            
            throw new Error('Syntax error at line ' + (i + 1) + '. Text: "' + line + '".');
        }
    };
})();

if (typeof module != 'undefined') {
    module.exports = SimpleIni;
}