(function () {
    // markdown -> html
    
    var NBSP = String.fromCharCode(160),
        INVISIBLE_BLANK = String.fromCharCode(8203),
        LINE_ELEMENT = 'p',
        BR_ELEMENT = 'br';
    
    
    // html -> markdown
    // dom <-> ref 관계만 이어진다면,
    // ref : 추가 정보 (key, value)
    // meta : type 별 정보 (type, inline/block, 표현 dom, matcher, parser)
    // dom에 ref-key 가 필요
    // sanitizer 구축
    // 허락하는 dom 구조 스펙이 필요
    // process
    // 1. dom sanitizing
    //    1-1. inline
    //    1-2. block
    // 2. dom ref mapping
    // 3. dom parsing
    
    
    var metaItems = {};
    
    function MetaItem(spec) {
        this.type = spec.type;
        this.display = spec.display;
        this.parse = spec.parse;
        
        
        //this.renderer = spec.renderer;
    }
    
    MetaItem.DefaultType = "text";
    MetaItem.register = metaRegister;
    MetaItem.getMeta = getMeta;
    MetaItem.getMetaOrDefault = getMetaOrDefault;
    
    function metaRegister(spec) {
        if (_.isNil(spec.type)) {
            return;
        }
        metaItems[spec.type] = new MetaItem(spec);
    }
    
    function getMeta(type) {
        if (_.isNil(type)) {
            return;
        }
        return metaItems[type];
    }
    
    function getMetaOrDefault(type) {
        return getMeta(type) || getMeta(MetaItem.DefaultType);
    }
    
    
    
    
    MetaItem.register({
        type: MetaItem.DefaultType,
        display: "inline",
        parse: function (content) {
            return {
                content: (content || '').replace(INVISIBLE_BLANK, '')
            };
        }
    });

    MetaItem.register({
        type: "mention",
        display: "inline",
        parse: function (ref) {
            
            if (!ref || _.isNil(ref.id)) {
                return;
            }
            
            var refs = {};
            
            refs[ref.id] = ref;
            
            return {
                content: '<@' + ref.name + '|' + ref.id + '>',
                refs: refs
            };
        }
    });
    
    
    
    
    
    
    
    
    function Manager() {
        this.refs = {};
    }

    Manager.create = createManager;
    Manager.prototype.setRef = setRef;
    Manager.prototype.getRef = getRef;
    Manager.prototype.getContent = getContent;
    
    
    function createManager() {
        return new Manager();
    }
    
    function setRef(key, ref) {
        return this.refs[key] = ref;
    }
    
    function getRef(key) {
        if (_.isNil(key)) {
            return;
        }
        return this.refs[key];
    }
    
    function lineSanitize(nodes) {
        
        var buf = [];
        
        // br 처리
        return _(nodes).map(function (node) {
            if (node.nodeName.toLowerCase() == BR_ELEMENT) {
                var line = buf; buf = [];
                return line;
            } else {
                buf.push(node);
            }
        }).concat([buf]).filter(_.negate(_.isEmpty)).value();
    }
    
    function getContent(nodes) {
        
        var manager = this;
        
        return _(nodes).map(function (node) {
            
            var refKey = node.attr("refKey"),
                ref,
                type,
                meta;
            
            if (node.nodeName.toLowerCase() === LINE_ELEMENT) {
                // inline 처리
                return manager.getContent(lineSanitize(node.childNodes));
            }
            
            
            if (_.isNil(refKey)) {
                type = MetaItem.DefaultType;
            } else {
                ref = manager.getRef(refKey);
                type = ref.type;
            }
            
            meta = MetaItem.getMetaOrDefault(type);
            
            if (meta.type == MetaItem.DefaultType) {
                return meta.parse(node.textContent);
            }
           
            return meta.parse(ref);
            
        }).value();
    }
    
    
    
})();