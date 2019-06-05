(function() {

    // 创建一个全局对象, 在浏览器中表示为window对象, 在Node.js中表示global对象
    var root = this;

    // 保存"_"(下划线变量)被覆盖之前的值
    // 如果出现命名冲突或考虑到规范, 可通过_.noConflict()方法恢复"_"被Underscore占用之前的值, 并返回Underscore对象以便重新命名
    var previousUnderscore = root._;

    // 创建一个空的对象常量, 便于内部共享使用
    var breaker = {};

    // 将内置对象的原型链缓存在局部变量, 方便快速调用
    var ArrayProto = Array.prototype, //
    ObjProto = Object.prototype, //
    FuncProto = Function.prototype;

    // 将内置对象原型中的常用方法缓存在局部变量, 方便快速调用
    var slice = ArrayProto.slice, //
    unshift = ArrayProto.unshift, //
    toString = ObjProto.toString, //
    hasOwnProperty = ObjProto.hasOwnProperty;

    // 这里定义了一些JavaScript 1.6提供的新方法
    // 如果宿主环境中支持这些方法则优先调用, 如果宿主环境中没有提供, 则会由Underscore实现
    var nativeForEach = ArrayProto.forEach, //
    nativeMap = ArrayProto.map, //
    nativeReduce = ArrayProto.reduce, //
    nativeReduceRight = ArrayProto.reduceRight, //
    nativeFilter = ArrayProto.filter, //
    nativeEvery = ArrayProto.every, //
    nativeSome = ArrayProto.some, //
    nativeIndexOf = ArrayProto.indexOf, //
    nativeLastIndexOf = ArrayProto.lastIndexOf, //
    nativeIsArray = Array.isArray, //
    nativeKeys = Object.keys, //
    nativeBind = FuncProto.bind;

    // 创建对象式的调用方式, 将返回一个Underscore包装器, 包装器对象的原型中包含Underscore所有方法(类似与将DOM对象包装为一个jQuery对象)
    var _ = function(obj) {
        // 所有Underscore对象在内部均通过wrapper对象进行构造
        return new wrapper(obj);
    };
    // 针对不同的宿主环境, 将Undersocre的命名变量存放到不同的对象中
    if( typeof exports !== 'undefined') {// Node.js环境
        if( typeof module !== 'undefined' && module.exports) {
            exports = module.exports = _;
        }
        exports._ = _;
    } else {// 浏览器环境中Underscore的命名变量被挂在window对象中
        root['_'] = _;
    }

    // 版本声明
    _.VERSION = '1.3.3';

    // 集合相关的方法(数据和对象的通用处理方法)
    // --------------------

    // 迭代处理器, 对集合中每一个元素执行处理器方法
    var each = _.each = _.forEach = function(obj, iterator, context) {
        // 不处理空值
        if(obj == null)
            return;
        if(nativeForEach && obj.forEach === nativeForEach) {
            // 如果宿主环境支持, 则优先调用JavaScript 1.6提供的forEach方法
            obj.forEach(iterator, context);
        } else if(obj.length === +obj.length) {
            // 对<数组>中每一个元素执行处理器方法
            for(var i = 0, l = obj.length; i < l; i++) {
                if( i in obj && iterator.call(context, obj[i], i, obj) === breaker)
                    return;
            }
        } else {
            // 对<对象>中每一个元素执行处理器方法
            for(var key in obj) {
                if(_.has(obj, key)) {
                    if(iterator.call(context, obj[key], key, obj) === breaker)
                        return;
                }
            }
        }
    };
    // 迭代处理器, 与each方法的差异在于map会存储每次迭代的返回值, 并作为一个新的数组返回
    _.map = _.collect = function(obj, iterator, context) {
        // 用于存放返回值的数组
        var results = [];
        if(obj == null)
            return results;
        // 优先调用宿主环境提供的map方法
        if(nativeMap && obj.map === nativeMap)
            return obj.map(iterator, context);
        // 迭代处理集合中的元素
        each(obj, function(value, index, list) {
            // 将每次迭代处理的返回值存储到results数组
            results[results.length] = iterator.call(context, value, index, list);
        });
        // 返回处理结果
        if(obj.length === +obj.length)
            results.length = obj.length;
        return results;
    };
    // 将集合中每个元素放入迭代处理器, 并将本次迭代的返回值作为"memo"传递到下一次迭代, 一般用于累计结果或连接数据
    _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
        // 通过参数数量检查是否存在初始值
        var initial = arguments.length > 2;
        if(obj == null)
            obj = [];
        // 优先调用宿主环境提供的reduce方法
        if(nativeReduce && obj.reduce === nativeReduce && false) {
            if(context)
                iterator = _.bind(iterator, context);
            return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
        }
        // 迭代处理集合中的元素
        each(obj, function(value, index, list) {
            if(!initial) {
                // 如果没有初始值, 则将第一个元素作为初始值; 如果被处理的是对象集合, 则默认值为第一个属性的值
                memo = value;
                initial = true;
            } else {
                // 记录处理结果, 并将结果传递给下一次迭代
                memo = iterator.call(context, memo, value, index, list);
            }
        });
        if(!initial)
            throw new TypeError('Reduce of empty array with no initial value');
        return memo;
    };
    // 与reduce作用相似, 将逆向迭代集合中的元素(即从最后一个元素开始直到第一个元素)
    _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
        var initial = arguments.length > 2;
        if(obj == null)
            obj = [];
        // 优先调用宿主环境提供的reduceRight方法
        if(nativeReduceRight && obj.reduceRight === nativeReduceRight) {
            if(context)
                iterator = _.bind(iterator, context);
            return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
        }
        // 逆转集合中的元素顺序
        var reversed = _.toArray(obj).reverse();
        if(context && !initial)
            iterator = _.bind(iterator, context);
        // 通过reduce方法处理数据
        return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
    };
    // 遍历集合中的元素, 返回第一个能够通过处理器验证的元素
    _.find = _.detect = function(obj, iterator, context) {
        // result存放第一个能够通过验证的元素
        var result;
        // 通过any方法遍历数据, 并记录通过验证的元素
        // (如果是在迭代中检查处理器返回状态, 这里使用each方法会更合适)
        any(obj, function(value, index, list) {
            // 如果处理器返回的结果被转换为Boolean类型后值为true, 则当前记录并返回当前元素
            if(iterator.call(context, value, index, list)) {
                result = value;
                return true;
            }
        });
        return result;
    };
    // 与find方法作用类似, 但filter方法会记录下集合中所有通过验证的元素
    _.filter = _.select = function(obj, iterator, context) {
        // 用于存储通过验证的元素数组
        var results = [];
        if(obj == null)
            return results;
        // 优先调用宿主环境提供的filter方法
        if(nativeFilter && obj.filter === nativeFilter)
            return obj.filter(iterator, context);
        // 迭代集合中的元素, 并将通过处理器验证的元素放到数组中并返回
        each(obj, function(value, index, list) {
            if(iterator.call(context, value, index, list))
                results[results.length] = value;
        });
        return results;
    };
    // 与filter方法作用相反, 即返回没有通过处理器验证的元素列表
    _.reject = function(obj, iterator, context) {
        var results = [];
        if(obj == null)
            return results;
        each(obj, function(value, index, list) {
            if(!iterator.call(context, value, index, list))
                results[results.length] = value;
        });
        return results;
    };
    // 如果集合中所有元素均能通过处理器验证, 则返回true
    _.every = _.all = function(obj, iterator, context) {
        var result = true;
        if(obj == null)
            return result;
        // 优先调用宿主环境提供的every方法
        if(nativeEvery && obj.every === nativeEvery)
            return obj.every(iterator, context);
        // 迭代集合中的元素
        each(obj, function(value, index, list) {
            // 这里理解为 result = (result && iterator.call(context, value, index, list))
            // 验证处理器的结果被转换为Boolean类型后是否为true值
            if(!( result = result && iterator.call(context, value, index, list)))
                return breaker;
        });
        return !!result;
    };
    // 检查集合中任何一个元素在被转换为Boolean类型时, 是否为true值?或者通过处理器处理后, 是否值为true?
    var any = _.some = _.any = function(obj, iterator, context) {
        // 如果没有指定处理器参数, 则默认的处理器函数会返回元素本身, 并在迭代时通过将元素转换为Boolean类型来判断是否为true值
        iterator || ( iterator = _.identity);
        var result = false;
        if(obj == null)
            return result;
        // 优先调用宿主环境提供的some方法
        if(nativeSome && obj.some === nativeSome)
            return obj.some(iterator, context);
        // 迭代集合中的元素
        each(obj, function(value, index, list) {
            if(result || ( result = iterator.call(context, value, index, list)))
                return breaker;
        });
        return !!result;
    };
    // 检查集合中是否有值与目标参数完全匹配(同时将匹配数据类型)
    _.include = _.contains = function(obj, target) {
        var found = false;
        if(obj == null)
            return found;
        // 优先调用宿主环境提供的Array.prototype.indexOf方法
        if(nativeIndexOf && obj.indexOf === nativeIndexOf)
            return obj.indexOf(target) != -1;
        // 通过any方法迭代集合中的元素, 验证元素的值和类型与目标是否完全匹配
        found = any(obj, function(value) {
            return value === target;
        });
        return found;
    };
    // 依次调用集合中所有元素的同名方法, 从第3个参数开始, 将被以此传入到元素的调用方法中
    // 返回一个数组, 存储了所有方法的处理结果
    _.invoke = function(obj, method) {
        // 调用同名方法时传递的参数(从第3个参数开始)
        var args = slice.call(arguments, 2);
        // 依次调用每个元素的方法, 并将结果放入数组中返回
        return _.map(obj, function(value) {
            return (_.isFunction(method) ? method || value : value[method]).apply(value, args);
        });
    };
    // 遍历一个由对象列表组成的数组, 并返回每个对象中的指定属性的值列表
    _.pluck = function(obj, key) {
        // 如果某一个对象中不存在该属性, 则返回undefined
        return _.map(obj, function(value) {
            return value[key];
        });
    };
    // 返回集合中的最大值, 如果不存在可比较的值, 则返回undefined
    _.max = function(obj, iterator, context) {
        // 如果集合是一个数组, 且没有使用处理器, 则使用Math.max获取最大值
        // 一般会是在一个数组存储了一系列Number类型的数据
        if(!iterator && _.isArray(obj) && obj[0] === +obj[0])
            return Math.max.apply(Math, obj);
        // 对于空值, 直接返回负无穷大
        if(!iterator && _.isEmpty(obj))
            return -Infinity;
        // 一个临时的对象, computed用于在比较过程中存储最大值(临时的)
        var result = {
            computed : -Infinity
        };
        // 迭代集合中的元素
        each(obj, function(value, index, list) {
            // 如果指定了处理器参数, 则比较的数据为处理器返回的值, 否则直接使用each遍历时的默认值
            var computed = iterator ? iterator.call(context, value, index, list) : value;
            // 如果比较值相比上一个值要大, 则将当前值放入result.value
            computed >= result.computed && ( result = {
                value : value,
                computed : computed
            });
        });
        // 返回最大值
        return result.value;
    };
    // 返回集合中的最小值, 处理过程与max方法一致
    _.min = function(obj, iterator, context) {
        if(!iterator && _.isArray(obj) && obj[0] === +obj[0])
            return Math.min.apply(Math, obj);
        if(!iterator && _.isEmpty(obj))
            return Infinity;
        var result = {
            computed : Infinity
        };
        each(obj, function(value, index, list) {
            var computed = iterator ? iterator.call(context, value, index, list) : value;
            computed < result.computed && ( result = {
                value : value,
                computed : computed
            });
        });
        return result.value;
    };
    // 通过随机数, 让数组无须排列
    _.shuffle = function(obj) {
        // shuffled变量存储处理过程及最终的结果数据
        var shuffled = [], rand;
        // 迭代集合中的元素
        each(obj, function(value, index, list) {
            // 生成一个随机数, 随机数在<0-当前已处理的数量>之间
            rand = Math.floor(Math.random() * (index + 1));
            // 将已经随机得到的元素放到shuffled数组末尾
            shuffled[index] = shuffled[rand];
            // 在前面得到的随机数的位置插入最新值
            shuffled[rand] = value;
        });
        // 返回一个数组, 该数组中存储了经过随机混排的集合元素
        return shuffled;
    };
    // 对集合中元素, 按照特定的字段或值进行排列
    // 相比Array.prototype.sort方法, sortBy方法支持对对象排序
    _.sortBy = function(obj, val, context) {
        // val应该是对象的一个属性, 或一个处理器函数, 如果是一个处理器, 则应该返回需要进行比较的数据
        var iterator = _.isFunction(val) ? val : function(obj) {
            return obj[val];
        };
        // 调用顺序: _.pluck(_.map().sort());
        // 调用_.map()方法遍历集合, 并将集合中的元素放到value节点, 将元素中需要进行比较的数据放到criteria属性中
        // 调用sort()方法将集合中的元素按照criteria属性中的数据进行顺序排序
        // 调用pluck获取排序后的对象集合并返回
        return _.pluck(_.map(obj, function(value, index, list) {
            return {
                value : value,
                criteria : iterator.call(context, value, index, list)
            };
        }).sort(function(left, right) {
            var a = left.criteria, b = right.criteria;
            if(a ===
                void 0)
                return 1;
            if(b ===
                void 0)
                return -1;
            return a < b ? -1 : a > b ? 1 : 0;
        }), 'value');
    };
    // 将集合中的元素, 按处理器返回的key分为多个数组
    _.groupBy = function(obj, val) {
        var result = {};
        // val将被转换为进行分组的处理器函数, 如果val不是一个Function类型的数据, 则将被作为筛选元素时的key值
        var iterator = _.isFunction(val) ? val : function(obj) {
            return obj[val];
        };
        // 迭代集合中的元素
        each(obj, function(value, index) {
            // 将处理器的返回值作为key, 并将相同的key元素放到一个新的数组
            var key = iterator(value, index);
            (result[key] || (result[key] = [])).push(value);
        });
        // 返回已分组的数据
        return result;
    };
    _.sortedIndex = function(array, obj, iterator) {
        iterator || ( iterator = _.identity);
        var low = 0, high = array.length;
        while(low < high) {
            var mid = (low + high) >> 1;
            iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
        }
        return low;
    };
    // 将一个集合转换一个数组并返回
    // 一般用于将arguments转换为数组, 或将对象无序集合转换为数据形式的有序集合
    _.toArray = function(obj) {
        if(!obj)
            return [];
        if(_.isArray(obj))
            return slice.call(obj);
        // 将arguments转换为数组
        if(_.isArguments(obj))
            return slice.call(obj);
        if(obj.toArray && _.isFunction(obj.toArray))
            return obj.toArray();
        // 将对象转换为数组, 数组中包含对象中所有属性的值列表(不包含对象原型链中的属性)
        return _.values(obj);
    };
    // 计算集合中元素的数量
    _.size = function(obj) {
        // 如果集合是一个数组, 则计算数组元素数量
        // 如果集合是一个对象, 则计算对象中的属性数量(不包含对象原型链中的属性)
        return _.isArray(obj) ? obj.length : _.keys(obj).length;
    };
    // 数组相关的方法
    // ---------------

    // 返回一个数组的第一个或順序指定的n个元素
    _.first = _.head = _.take = function(array, n, guard) {
        // 如果没有指定参数n, 则返回第一个元素
        // 如果指定了n, 则返回一个新的数组, 包含顺序指定数量n个元素
        // guard参数用于确定只返回第一个元素, 当guard为true时, 指定数量n无效
        return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
    };
    // 返回一个新数组, 包含除第一个元素外的其它元素, 或排除从最后一个元素开始向前指定n个元素
    // 与first方法不同在于, first确定需要的元素在数组之前的位置, initial确定能排除的元素在数组最后的位置
    _.initial = function(array, n, guard) {
        // 如果没有传递参数n, 则默认返回除最后一个元素外的其它元素
        // 如果传递参数n, 则返回从最后一个元素开始向前的n个元素外的其它元素
        // guard用于确定只返回一个元素, 当guard为true时, 指定数量n无效
        return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
    };
    // 返回数组的最后一个或倒序指定的n个元素
    _.last = function(array, n, guard) {
        if((n != null) && !guard) {
            // 计算并指定获取的元素位置n, 直到数组末尾, 作为一个新的数组返回
            return slice.call(array, Math.max(array.length - n, 0));
        } else {
            // 如果没有指定数量, 或guard为true时, 只返回最后一个元素
            return array[array.length - 1];
        }
    };
    // 获取除了第一个或指定前n个元素外的其它元素
    _.rest = _.tail = function(array, index, guard) {
        // 计算slice的第二个位置参数, 直到数组末尾
        // 如果没有指定index, 或guard值为true, 则返回除第一个元素外的其它元素
        // (index == null)值为true时, 作为参数传递给slice函数将被自动转换为1
        return slice.call(array, (index == null) || guard ? 1 : index);
    };
    // 返回数组中所有值能被转换为true的元素, 返回一个新的数组
    // 不能被转换的值包括 false, 0, '', null, undefined, NaN, 这些值将被转换为false
    _.compact = function(array) {
        return _.filter(array, function(value) {
            return !!value;
        });
    };
    // 将一个多维数组合成为一维数组, 支持深层合并
    // shallow参数用于控制合并深度, 当shallow为true时, 只合并第一层, 默认进行深层合并
    _.flatten = function(array, shallow) {
        // 迭代数组中的每一个元素, 并将返回值作为demo传递给下一次迭代
        return _.reduce(array, function(memo, value) {
            // 如果元素依然是一个数组, 进行以下判断:
            // - 如果不进行深层合并, 则使用Array.prototype.concat将当前数组和之前的数据进行连接
            // - 如果支持深层合并, 则迭代调用flatten方法, 直到底层元素不再是数组类型
            if(_.isArray(value))
                return memo.concat( shallow ? value : _.flatten(value));
            // 数据(value)已经处于底层, 不再是数组类型, 则将数据合并到memo中并返回
            memo[memo.length] = value;
            return memo;
        }, []);
    };
    // 筛选并返回当前数组中与指定数据不相等的差异数据(可参考difference方法注释)
    _.without = function(array) {
        return _.difference(array, slice.call(arguments, 1));
    };
    // 对数组中的数据进行去重(使用===进行比较)
    // 当isSorted参数不为false时, 将依次对数组中的元素调用include方法, 检查相同元素是否已经被添加到返回值(数组)中
    // 如果调用之前确保数组中数据按顺序排列, 则可以将isSorted设为true, 它将通过与最后一个元素进行对比来排除相同值, 使用isSorted效率会高于默认的include方式
    // uniq方法默认将以数组中的数据进行对比, 如果声明iterator处理器, 则会根据处理器创建一个对比数组, 比较时以该数组中的数据为准, 但最终返回的唯一数据仍然是原始数组
    _.uniq = _.unique = function(array, isSorted, iterator) {
        // 如果使用了iterator处理器, 则先将当前数组中的数据会先经过按迭代器处理, 并返回一个处理后的新数组
        // 新数组用于作为比较的基准
        var initial = iterator ? _.map(array, iterator) : array;
        // 用于记录处理结果的临时数组
        var results = [];
        // 如果数组中只有2个值, 则不需要使用include方法进行比较, 将isSorted设置为true能提高运行效率
        if(array.length < 3)
            isSorted = true;
        // 使用reduce方法迭代并累加处理结果
        // initial变量是需要进行比较的基准数据, 它可能是原始数组, 也可能是处理器的结果集合(如果设置过iterator)
        _.reduce(initial, function(memo, value, index) {
            // 如果isSorted参数为true, 则直接使用===比较记录中的最后一个数据
            // 如果isSorted参数为false, 则使用include方法与集合中的每一个数据进行对比
            if( isSorted ? _.last(memo) !== value || !memo.length : !_.include(memo, value)) {
                // memo记录了已经比较过的无重复数据
                // 根据iterator参数的状态, memo中记录的数据可能是原始数据, 也可能是处理器处理后的数据
                memo.push(value);
                // 处理结果数组中保存的始终为原始数组中的数据
                results.push(array[index]);
            }
            return memo;
        }, []);
        // 返回处理结果, 它只包含数组中无重复的数据
        return results;
    };
    // union方法与uniq方法作用一致, 不同之处在于union允许在参数中传入多个数组
    _.union = function() {
        // union对参数中的多个数组进行浅层合并为一个数组对象传递给uniq方法进行处理
        return _.uniq(_.flatten(arguments, true));
    };
    // 获取当前数组与其它一个或多个数组的交集元素
    // 从第二个参数开始为需要进行比较的一个或多个数组
    _.intersection = _.intersect = function(array) {
        // rest变量记录需要进行比较的其它数组对象
        var rest = slice.call(arguments, 1);
        // 使用uniq方法去除当前数组中的重复数据, 避免重复计算
        // 对当前数组的数据通过处理器进行过滤, 并返回符合条件(比较相同元素)的数据
        return _.filter(_.uniq(array), function(item) {
            // 使用every方法验证每一个数组中都包含了需要对比的数据
            // 如果所有数组中均包含对比数据, 则全部返回true, 如果任意一个数组没有包含该元素, 则返回false
            return _.every(rest, function(other) {
                // other参数存储了每一个需要进行对比的数组
                // item存储了当前数组中需要进行对比的数据
                // 使用indexOf方法搜索数组中是否存在该元素(可参考indexOf方法注释)
                return _.indexOf(other, item) >= 0;
            });
        });
    };
    // 筛选并返回当前数组中与指定数据不相等的差异数据
    // 该函数一般用于删除数组中指定的数据, 并得到删除后的新数组
    // 该方法的作用与without相等, without方法参数形式上不允许数据被包含在数组中, 而difference方法参数形式上建议是数组(也可以和without使用相同形式的参数)
    _.difference = function(array) {
        // 对第2个参数开始的所有参数, 作为一个数组进行合并(仅合并第一层, 而并非深层合并)
        // rest变量存储验证数据, 在本方法中用于与原数据对比
        var rest = _.flatten(slice.call(arguments, 1), true);
        // 对合并后的数组数据进行过滤, 过滤条件是当前数组中不包含参数指定的验证数据的内容
        // 将符合过滤条件的数据组合为一个新的数组并返回
        return _.filter(array, function(value) {
            return !_.include(rest, value);
        });
    };
    // 将每个数组的相同位置的数据作为一个新的二维数组返回, 返回的数组长度以传入参数中最大的数组长度为准, 其它数组的空白位置使用undefined填充
    // zip方法应该包含多个参数, 且每个参数应该均为数组
    _.zip = function() {
        // 将参数转换为数组, 此时args是一个二维数组
        var args = slice.call(arguments);
        // 计算每一个数组的长度, 并返回其中最大长度值
        var length = _.max(_.pluck(args, 'length'));
        // 依照最大长度值创建一个新的空数组, 该数组用于存储处理结果
        var results = new Array(length);
        // 循环最大长度, 在每次循环将调用pluck方法获取每个数组中相同位置的数据(依次从0到最后位置)
        // 将获取到的数据存储在一个新的数组, 放入results并返回
        for(var i = 0; i < length; i++)
        results[i] = _.pluck(args, "" + i);
        // 返回的结果是一个二维数组
        return results;
    };
    // 搜索一个元素在数组中首次出现的位置, 如果元素不存在则返回 -1
    // 搜索时使用 === 对元素进行匹配
    _.indexOf = function(array, item, isSorted) {
        if(array == null)
            return -1;
        var i, l;
        if(isSorted) {
            i = _.sortedIndex(array, item);
            return array[i] === item ? i : -1;
        }
        // 优先调用宿主环境提供的indexOf方法
        if(nativeIndexOf && array.indexOf === nativeIndexOf)
            return array.indexOf(item);
        // 循环并返回元素首次出现的位置
        for( i = 0, l = array.length; i < l; i++)
        if( i in array && array[i] === item)
            return i;
        // 没有找到元素, 返回-1
        return -1;
    };
    // 返回一个元素在数组中最后一次出现的位置, 如果元素不存在则返回 -1
    // 搜索时使用 === 对元素进行匹配
    _.lastIndexOf = function(array, item) {
        if(array == null)
            return -1;
        // 优先调用宿主环境提供的lastIndexOf方法
        if(nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf)
            return array.lastIndexOf(item);
        var i = array.length;
        // 循环并返回元素最后出现的位置
        while(i--)
        if( i in array && array[i] === item)
            return i;
        // 没有找到元素, 返回-1
        return -1;
    };
    // 根据区间和步长, 生成一系列整数, 并作为数组返回
    // start参数表示最小数
    // stop参数表示最大数
    // step参数表示生成多个数值之间的步长值
    _.range = function(start, stop, step) {
        // 参数控制
        if(arguments.length <= 1) {
            // 如果没有参数, 则start = 0, stop = 0, 在循环中不会生成任何数据, 将返回一个空数组
            // 如果有1个参数, 则参数指定给stop, start = 0
            stop = start || 0;
            start = 0;
        }
        // 生成整数的步长值, 默认为1
        step = arguments[2] || 1;

        // 根据区间和步长计算将生成的最大值
        var len = Math.max(Math.ceil((stop - start) / step), 0);
        var idx = 0;
        var range = new Array(len);

        // 生成整数列表, 并存储到range数组
        while(idx < len) {
            range[idx++] = start;
            start += step;
        }

        // 返回列表结果
        return range;
    };
    // 函数相关方法
    // ------------------

    // 创建一个用于设置prototype的公共函数对象
    var ctor = function() {
    };
    // 为一个函数绑定执行上下文, 任何情况下调用该函数, 函数中的this均指向context对象
    // 绑定函数时, 可以同时给函数传递调用形参
    _.bind = function bind(func, context) {
        var bound, args;
        // 优先调用宿主环境提供的bind方法
        if(func.bind === nativeBind && nativeBind)
            return nativeBind.apply(func, slice.call(arguments, 1));
        // func参数必须是一个函数(Function)类型
        if(!_.isFunction(func))
            throw new TypeError;
        // args变量存储了bind方法第三个开始的参数列表, 每次调用时都将传递给func函数
        args = slice.call(arguments, 2);
        return bound = function() {
            if(!(this instanceof bound))
                return func.apply(context, sargs.concat(slice.call(arguments)));
            ctor.prototype = func.prototype;
            var self = new ctor;
            var result = func.apply(self, args.concat(slice.call(arguments)));
            if(Object(result) === result)
                return result;
            return self;
        };
    };
    // 将指定的函数, 或对象本身的所有函数上下本绑定到对象本身, 被绑定的函数在被调用时, 上下文对象始终指向对象本身
    // 该方法一般在处理对象事件时使用, 例如:
    // _(obj).bindAll(); // 或_(obj).bindAll('handlerClick');
    // document.addEventListener('click', obj.handlerClick);
    // 在handlerClick方法中, 上下文依然是obj对象
    _.bindAll = function(obj) {
        // 第二个参数开始表示需要绑定的函数名称
        var funcs = slice.call(arguments, 1);
        // 如果没有指定特定的函数名称, 则默认绑定对象本身所有类型为Function的属性
        if(funcs.length == 0)
            funcs = _.functions(obj);
        // 循环并将所有的函数上下本设置为obj对象本身
        // each方法本身不会遍历对象原型链中的方法, 但此处的funcs列表是通过_.functions方法获取的, 它已经包含了原型链中的方法
        each(funcs, function(f) {
            obj[f] = _.bind(obj[f], obj);
        });
        return obj;
    };
    // memoize方法将返回一个函数, 该函数集成了缓存功能, 将经过计算的值缓存到局部变量并在下次调用时直接返回
    // 如果计算结果是一个庞大的对象或数据, 使用时应该考虑内存占用情况
    _.memoize = function(func, hasher) {
        // 用于存储缓存结果的memo对象
        var memo = {};
        // hasher参数应该是一个function, 它用于返回一个key, 该key作为读取缓存的标识
        // 如果没有指定key, 则默认使用函数的第一个参数作为key, 如果函数的第一个参数是复合数据类型, 可能会返回类似[Object object]的key, 这个key可能会造成后续计算的数据不正确
        hasher || ( hasher = _.identity);
        // 返回一个函数, 该函数首先通过检查缓存, 再对没有缓存过的数据进行调用
        return function() {
            var key = hasher.apply(this, arguments);
            return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
        };
    };
    // 延时执行一个函数
    // wait单位为ms, 第3个参数开始将被依次传递给执行函数
    _.delay = function(func, wait) {
        var args = slice.call(arguments, 2);
        return setTimeout(function() {
            return func.apply(null, args);
        }, wait);
    };
    // 延迟执行函数
    // JavaScript中的setTimeout会被放到一个单独的函数堆栈中执行, 执行时间是在当前堆栈中调用的函数都被执行完毕之后
    // defer设置函数在1ms后执行, 目的是将func函数放到单独的堆栈中, 等待当前函数执行完成后再执行
    // defer方法一般用于处理DOM操作的优先级, 实现正确的逻辑流程和更流畅的交互体验
    _.defer = function(func) {
        return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
    };
    // 函数节流方法, throttle方法主要用于控制函数的执行频率, 在被控制的时间间隔内, 频繁调用函数不会被多次执行
    // 在时间间隔内如果多次调用了函数, 时间隔截止时会自动调用一次, 不需要等到时间截止后再手动调用(自动调用时不会有返回值)
    // throttle函数一般用于处理复杂和调用频繁的函数, 通过节流控制函数的调用频率, 节省处理资源
    // 例如window.onresize绑定的事件函数, 或element.onmousemove绑定的事件函数, 可以用throttle进行包装
    // throttle方法返回一个函数, 该函数会自动调用func并进行节流控制
    _.throttle = function(func, wait) {
        var context, args, timeout, throttling, more, result;
        // whenDone变量调用了debounce方法, 因此在多次连续调用函数时, 最后一次调用会覆盖之前调用的定时器, 清除状态函数也仅会被执行一次
        // whenDone函数在最后一次函数执行的时间间隔截止时调用, 清除节流和调用过程中记录的一些状态
        var whenDone = _.debounce(function() {
            more = throttling = false;
        }, wait);
        // 返回一个函数, 并在函数内进行节流控制
        return function() {
            // 保存函数的执行上下文和参数
            context = this;
            args = arguments;
            // later函数在上一次函数调用时间间隔截止时执行
            var later = function() {
                // 清除timeout句柄, 方便下一次函数调用
                timeout = null;
                // more记录了在上一次调用至时间间隔截止之间, 是否重复调用了函数
                // 如果重复调用了函数, 在时间间隔截止时将自动再次调用函数
                if(more)
                    func.apply(context, args);
                // 调用whenDone, 用于在时间间隔后清除节流状态
                whenDone();
            };
            // timeout记录了上一次函数执行的时间间隔句柄
            // timeout时间间隔截止时调用later函数, later中将清除timeout, 并检查是否需要再次调用函数
            if(!timeout)
                timeout = setTimeout(later, wait);
            // throttling变量记录上次调用的时间间隔是否已经结束, 即是否处于节流过程中
            // throttling在每次函数调用时设为true, 表示需要进行节流, 在时间间隔截止时设置为false(在whenDone函数中实现)
            if(throttling) {
                // 节流过程中进行了多次调用, 在more中记录一个状态, 表示在时间间隔截止时需要再次自动调用函数
                more = true;
            } else {
                // 没有处于节流过程, 可能是第一次调用函数, 或已经超过上一次调用的间隔, 可以直接调用函数
                result = func.apply(context, args);
            }
            // 调用whenDone, 用于在时间间隔后清除节流状态
            whenDone();
            // throttling变量记录函数调用时的节流状态
            throttling = true;
            // 返回调用结果
            return result;
        };
    };
    // debounce与throttle方法类似, 用于函数节流, 它们的不同之处在于:
    // -- throttle关注函数的执行频率, 在指定频率内函数只会被执行一次;
    // -- debounce函数更关注函数执行的间隔, 即函数两次的调用时间不能小于指定时间;
    // 如果两次函数的执行间隔小于wait, 定时器会被清除并重新创建, 这意味着连续频繁地调用函数, 函数一直不会被执行, 直到某一次调用与上一次调用的时间不小于wait毫秒
    // debounce函数一般用于控制需要一段时间之后才能执行的操作, 例如在用户输入完毕200ms后提示用户, 可以使用debounce包装一个函数, 绑定到onkeyup事件
    // ----------------------------------------------------------------
    // @param {Function} func 表示被执行的函数
    // @param {Number} wait 表示允许的时间间隔, 在该时间范围内重复调用会被重新推迟wait毫秒
    // @param {Boolean} immediate 表示函数调用后是否立即执行, true为立即调用, false为在时间截止时调用
    // debounce方法返回一个函数, 该函数会自动调用func并进行节流控制
    _.debounce = function(func, wait, immediate) {
        // timeout用于记录函数上一次调用的执行状态(定时器句柄)
        // 当timeout为null时, 表示上一次调用已经结束
        var timeout;
        // 返回一个函数, 并在函数内进行节流控制
        return function() {
            // 保持函数的上下文对象和参数
            var context = this, args = arguments;
            var later = function() {
                // 设置timeout为null
                // later函数会在允许的时间截止时被调用
                // 调用该函数时, 表明上一次函数执行时间已经超过了约定的时间间隔, 此时之后再进行调用都是被允许的
                timeout = null;
                if(!immediate)
                    func.apply(context, args);
            };
            // 如果函数被设定为立即执行, 且上一次调用的时间间隔已经过去, 则立即调用函数
            if(immediate && !timeout)
                func.apply(context, args);
            // 创建一个定时器用于检查和设置函数的调用状态
            // 创建定时器之前先清空上一次setTimeout句柄, 无论上一次绑定的函数是否已经被执行
            // 如果本次函数在调用时, 上一次函数执行还没有开始(一般是immediate设置为false时), 则函数的执行时间会被推迟, 因此timeout句柄会被重新创建
            clearTimeout(timeout);
            // 在允许的时间截止时调用later函数
            timeout = setTimeout(later, wait);
        };
    };
    // 创建一个只会被执行一次的函数, 如果该函数被重复调用, 将返回第一次执行的结果
    // 该函数用于获取和计算固定数据的逻辑, 如获取用户所用的浏览器类型
    _.once = function(func) {
        // ran记录函数是否被执行过
        // memo记录函数最后一次执行的结果
        var ran = false, memo;
        return function() {
            // 如果函数已被执行过, 则直接返回第一次执行的结果
            if(ran)
                return memo;
            ran = true;
            return memo = func.apply(this, arguments);
        };
    };
    // 返回一个函数, 该函数会将当前函数作为参数传递给一个包裹函数
    // 在包裹函数中可以通过第一个参数调用当前函数, 并返回结果
    // 一般用于多个流程处理函数的低耦合组合调用
    _.wrap = function(func, wrapper) {
        return function() {
            // 将当前函数作为第一个参数, 传递给wrapper函数
            var args = [func].concat(slice.call(arguments, 0));
            // 返回wrapper函数的处理结果
            return wrapper.apply(this, args);
        };
    };
    // 将多个函数组合到一起, 按照参数传递的顺序, 后一个函数的返回值会被一次作为参数传递给前一个函数作为参数继续处理
    // _.compose(A, B, C); 等同于 A(B(C()));
    // 该方法的缺点在于被关联的函数处理的参数数量只能有一个, 如果需要传递多个参数, 可以通过Array或Object复合数据类型进行组装
    _.compose = function() {
        // 获取函数列表, 所有参数需均为Function类型
        var funcs = arguments;
        // 返回一个供调用的函数句柄
        return function() {
            // 从后向前依次执行函数, 并将记录的返回值作为参数传递给前一个函数继续处理
            var args = arguments;
            for(var i = funcs.length - 1; i >= 0; i--) {
                args = [funcs[i].apply(this, args)];
            }
            // 返回最后一次调用函数的返回值
            return args[0];
        };
    };
    // 返回一个函数, 该函数作为调用计数器, 当该函数被调用times次(或超过times次)后, func函数将被执行
    // after方法一般用作异步的计数器, 例如在多个AJAX请求全部完成后需要执行一个函数, 则可以使用after在每个AJAX请求完成后调用
    _.after = function(times, func) {
        // 如果没有指定或指定无效次数, 则func被直接调用
        if(times <= 0)
            return func();
        // 返回一个计数器函数
        return function() {
            // 每次调用计数器函数times减1, 调用times次之后执行func函数并返回func函数的返回值
            if(--times < 1) {
                return func.apply(this, arguments);
            }
        };
    };
    // 对象相关方法
    // ----------------

    // 获取一个对象的属性名列表(不包含原型链中的属性)
    _.keys = nativeKeys ||
    function(obj) {
        if(obj !== Object(obj))
            throw new TypeError('Invalid object');
        var keys = [];
        // 记录并返回对象的所有属性名
        for(var key in obj)
        if(_.has(obj, key))
            keys[keys.length] = key;
        return keys;
    };

    // 返回一个对象中所有属性的值列表(不包含原型链中的属性)
    _.values = function(obj) {
        return _.map(obj, _.identity);
    };
    // 获取一个对象中所有属性值为Function类型的key列表, 并按key名进行排序(包含原型链中的属性)
    _.functions = _.methods = function(obj) {
        var names = [];
        for(var key in obj) {
            if(_.isFunction(obj[key]))
                names.push(key);
        }
        return names.sort();
    };
    // 将一个或多个对象的属性(包含原型链中的属性), 复制到obj对象, 如果存在同名属性则覆盖
    _.extend = function(obj) {
        // each循环参数中的一个或多个对象
        each(slice.call(arguments, 1), function(source) {
            // 将对象中的全部属性复制或覆盖到obj对象
            for(var prop in source) {
                obj[prop] = source[prop];
            }
        });
        return obj;
    };
    // ----------------

    // 返回一个新对象, 并从obj中复制指定的属性到新对象中
    // 第2个参数开始为指定的需要复制的属性名(支持多个参数和深层数组)
    _.pick = function(obj) {
        // 创建一个对象, 存放复制的指定属性
        var result = {};
        // 从第二个参数开始合并为一个存放属性名列表的数组
        each(_.flatten(slice.call(arguments, 1)), function(key) {
            // 循环属性名列表, 如果obj中存在该属性, 则将其复制到result对象
            if( key in obj)
                result[key] = obj[key];
        });
        // 返回复制结果
        return result;
    };
    // 将obj中不存在或转换为Boolean类型后值为false的属性, 从参数中指定的一个或多个对象中复制到obj
    // 一般用于给对象指定默认值
    _.defaults = function(obj) {
        // 从第二个参数开始可指定多个对象, 这些对象中的属性将被依次复制到obj对象中(如果obj对象中不存在该属性的话)
        each(slice.call(arguments, 1), function(source) {
            // 遍历每个对象中的所有属性
            for(var prop in source) {
                // 如果obj中不存在或属性值转换为Boolean类型后值为false, 则将属性复制到obj中
                if(obj[prop] == null)
                    obj[prop] = source[prop];
            }
        });
        return obj;
    };
    // 创建一个obj的副本, 返回一个新的对象, 该对象包含obj中的所有属性和值的状态
    // clone函数不支持深层复制, 例如obj中的某个属性存放着一个对象, 则该对象不会被复制
    // 如果obj是一个数组, 则会创建一个相同的数组对象
    _.clone = function(obj) {
        // 不支持非数组和对象类型的数据
        if(!_.isObject(obj))
            return obj;
        // 复制并返回数组或对象
        return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
    };
    // 执行一个函数, 并将obj作为参数传递给该函数, 函数执行完毕后最终返回obj对象
    // 一般在创建一个方法链的时候会使用tap方法, 例如:
    // _(obj).chain().tap(click).tap(mouseover).tap(mouseout);
    _.tap = function(obj, interceptor) {
        interceptor(obj);
        return obj;
    };
    // eq函数只在isEqual方法中调用, 用于比较两个数据的值是否相等
    // 与 === 不同在于, eq更关注数据的值
    // 如果进行比较的是两个复合数据类型, 不仅仅比较是否来自同一个引用, 且会进行深层比较(对两个对象的结构和数据进行比较)
    function eq(a, b, stack) {
        // 检查两个简单数据类型的值是否相等
        // 对于复合数据类型, 如果它们来自同一个引用, 则认为其相等
        // 如果被比较的值其中包含0, 则检查另一个值是否为-0, 因为 0 === -0 是成立的
        // 而 1 / 0 == 1 / -0 是不成立的(1 / 0值为Infinity, 1 / -0值为-Infinity, 而Infinity不等于-Infinity)
        if(a === b)
            return a !== 0 || 1 / a == 1 / b;
        // 将数据转换为布尔类型后如果值为false, 将判断两个值的数据类型是否相等(因为null与undefined, false, 0, 空字符串, 在非严格比较下值是相等的)
        if(a == null || b == null)
            return a === b;
        // 如果进行比较的数据是一个Underscore封装的对象(具有_chain属性的对象被认为是Underscore对象)
        // 则将对象解封后获取本身的数据(通过_wrapped访问), 然后再对本身的数据进行比较
        // 它们的关系类似与一个jQuery封装的DOM对象, 和浏览器本身创建的DOM对象
        if(a._chain)
            a = a._wrapped;
        if(b._chain)
            b = b._wrapped;
        // 如果对象提供了自定义的isEqual方法(此处的isEqual方法并非Undersocre对象的isEqual方法, 因为在上一步已经对Undersocre对象进行了解封)
        // 则使用对象自定义的isEqual方法与另一个对象进行比较
        if(a.isEqual && _.isFunction(a.isEqual))
            return a.isEqual(b);
        if(b.isEqual && _.isFunction(b.isEqual))
            return b.isEqual(a);
        // 对两个数据的数据类型进行验证
        // 获取对象a的数据类型(通过Object.prototype.toString方法)
        var className = toString.call(a);
        // 如果对象a的数据类型与对象b不匹配, 则认为两个数据值也不匹配
        if(className != toString.call(b))
            return false;
        // 执行到此处, 可以确保需要比较的两个数据均为复合数据类型, 且数据类型相等
        // 通过switch检查数据的数据类型, 针对不同数据类型进行不同的比较
        // (此处不包括对数组和对象类型, 因为它们可能包含更深层次的数据, 将在后面进行深层比较)
        switch (className) {
            case '[object String]':
                // 如果被比较的是字符串类型(其中a的是通过new String()创建的字符串)
                // 则将B转换为String对象后进行匹配(这里匹配并非进行严格的数据类型检查, 因为它们并非来自同一个对象的引用)
                // 在调用 == 进行比较时, 会自动调用对象的toString()方法, 返回两个简单数据类型的字符串
                return a == String(b);
            case '[object Number]':
                // 通过+a将a转成一个Number, 如果a被转换之前与转换之后不相等, 则认为a是一个NaN类型
                // 因为NaN与NaN是不相等的, 因此当a值为NaN时, 无法简单地使用a == b进行匹配, 而是用相同的方法检查b是否为NaN(即 b != +b)
                // 当a值是一个非NaN的数据时, 则检查a是否为0, 因为当b为-0时, 0 === -0是成立的(实际上它们在逻辑上属于两个不同的数据)
                return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
            case '[object Date]':
            // 对日期类型没有使用return或break, 因此会继续执行到下一步(无论数据类型是否为Boolean类型, 因为下一步将对Boolean类型进行检查)
            case '[object Boolean]':
                // 将日期或布尔类型转换为数字
                // 日期类型将转换为数值类型的时间戳(无效的日期格式将被换转为NaN)
                // 布尔类型中, true被转换为1, false被转换为0
                // 比较两个日期或布尔类型被转换为数字后是否相等
                return +a == +b;
            case '[object RegExp]':
                // 正则表达式类型, 通过source访问表达式的字符串形式
                // 检查两个表达式的字符串形式是否相等
                // 检查两个表达式的全局属性是否相同(包括g, i, m)
                // 如果完全相等, 则认为两个数据相等
                return a.source == b.source && a.global == b.global && a.multiline == b.multiline && a.ignoreCase == b.ignoreCase;
        }
        // 当执行到此时, ab两个数据应该为类型相同的对象或数组类型
        if( typeof a != 'object' || typeof b != 'object')
            return false;
        // stack(堆)是在isEqual调用eq函数时内部传递的空数组, 在后面比较对象和数据的内部迭代中调用eq方法也会传递
        // length记录堆的长度
        var length = stack.length;
        while(length--) {
            // 如果堆中的某个对象与数据a匹配, 则认为相等
            if(stack[length] == a)
                return true;
        }
        // 将数据a添加到堆中
        stack.push(a);
        // 定义一些局部变量
        var size = 0, result = true;
        // 通过递归深层比较对象和数组
        if(className == '[object Array]') {
            // 被比较的数据为数组类型
            // size记录数组的长度
            // result比较两个数组的长度是否一致, 如果长度不一致, 则方法的最后将返回result(即false)
            size = a.length;
            result = size == b.length;
            // 如果两个数组的长度一致
            if(result) {
                // 调用eq方法对数组中的元素进行迭代比较(如果数组中包含二维数组或对象, eq方法会进行深层比较)
                while(size--) {
                    // 在确保两个数组都存在当前索引的元素时, 调用eq方法深层比较(将堆数据传递给eq方法)
                    // 将比较的结果存储到result变量, 如果result为false(即在比较中得到某个元素的数据不一致), 则停止迭代
                    if(!( result = size in a == size in b && eq(a[size], b[size], stack)))
                        break;
                }
            }
        } else {
            // 被比较的数据为对象类型
            // 如果两个对象不是同一个类的实例(通过constructor属性比较), 则认为两个对象不相等
            if('constructor' in a != 'constructor' in b || a.constructor != b.constructor)
                return false;
            // 深层比较两个对象中的数据
            for(var key in a) {
                if(_.has(a, key)) {
                    // size用于记录比较过的属性数量, 因为这里遍历的是a对象的属性, 并比较b对象中该属性的数据
                    // 当b对象中的属性数量多余a对象时, 此处的逻辑成立, 但两个对象并不相等
                    size++;
                    // 迭代调用eq方法, 深层比较两个对象中的属性值
                    // 将比较的结果记录到result变量, 当比较到不相等的数据时停止迭代
                    if(!( result = _.has(b, key) && eq(a[key], b[key], stack)))
                        break;
                }
            }
            // 深层比较完毕, 这里已经可以确保在对象a中的所有数据, 对象b中也存在相同的数据
            // 根据size(对象属性长度)检查对象b中的属性数量是否与对象a相等
            if(result) {
                // 遍历对象b中的所有属性
                for(key in b) {
                    // 当size已经到0时(即对象a中的属性数量已经遍历完毕), 而对象b中还存在有属性, 则对象b中的属性多于对象a
                    if(_.has(b, key) && !(size--))
                        break;
                }
                // 当对象b中的属性多于对象a, 则认为两个对象不相等
                result = !size;
            }
        }
        // 函数执行完毕时, 从堆中移除第一个数据(在比较对象或数组时, 会迭代eq方法, 堆中可能存在多个数据)
        stack.pop();
        // 返回的result记录了最终的比较结果
        return result;
    }

    // 对两个数据的值进行比较(支持复合数据类型), 内部函数eq的外部方法
    _.isEqual = function(a, b) {
        return eq(a, b, []);
    };
    // 检查数据是否为空值, 包含'', false, 0, null, undefined, NaN, 空数组(数组长度为0)和空对象(对象本身没有任何属性)
    _.isEmpty = function(obj) {
        // obj被转换为Boolean类型后值为false
        if(obj == null)
            return true;
        // 检查对象或字符串长度是否为0
        if(_.isArray(obj) || _.isString(obj))
            return obj.length === 0;
        // 检查对象(使用for in循环时将首先循环对象本身的属性, 其次是原型链中的属性), 因此如果第一个属性是属于对象本身的, 那么该对象不是一个空对象
        for(var key in obj)
        if(_.has(obj, key))
            return false;
        // 所有数据类型均没有通过验证, 是一个空数据
        return true;
    };
    // 验证对象是否是一个DOM对象
    _.isElement = function(obj) {
        return !!(obj && obj.nodeType == 1);
    };
    // 验证对象是否是一个数组类型, 优先调用宿主环境提供的isArray方法
    _.isArray = nativeIsArray ||
    function(obj) {
        return toString.call(obj) == '[object Array]';
    };

    // 验证对象是否是一个复合数据类型的对象(即非基本数据类型String, Boolean, Number, null, undefined)
    // 如果基本数据类型通过new进行创建, 则也属于对象类型
    _.isObject = function(obj) {
        return obj === Object(obj);
    };
    // 检查一个数据是否是一个arguments参数对象
    _.isArguments = function(obj) {
        return toString.call(obj) == '[object Arguments]';
    };
    // 验证isArguments函数, 如果运行环境无法正常验证arguments类型的数据, 则重新定义isArguments方法
    if(!_.isArguments(arguments)) {
        // 对于环境无法通过toString验证arguments类型的, 则通过调用arguments独有的callee方法来进行验证
        _.isArguments = function(obj) {
            // callee是arguments的一个属性, 指向对arguments所属函数自身的引用
            return !!(obj && _.has(obj, 'callee'));
        };
    }

    // 验证对象是否是一个函数类型
    _.isFunction = function(obj) {
        return toString.call(obj) == '[object Function]';
    };
    // 验证对象是否是一个字符串类型
    _.isString = function(obj) {
        return toString.call(obj) == '[object String]';
    };
    // 验证对象是否是一个数字类型
    _.isNumber = function(obj) {
        return toString.call(obj) == '[object Number]';
    };
    // 检查一个数字是否为有效数字且有效范围(Number类型, 值在负无穷大 - 正无穷大之间)
    _.isFinite = function(obj) {
        return _.isNumber(obj) && isFinite(obj);
    };
    // 检查数据是否为NaN类型(所有数据中只有NaN与NaN不相等)
    _.isNaN = function(obj) {
        return obj !== obj;
    };
    // 检查数据是否时Boolean类型
    _.isBoolean = function(obj) {
        // 支持字面量和对象形式的Boolean数据
        return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
    };
    // 检查数据是否是一个Date类型
    _.isDate = function(obj) {
        return toString.call(obj) == '[object Date]';
    };
    // 检查数据是否是一个正则表达式类型
    _.isRegExp = function(obj) {
        return toString.call(obj) == '[object RegExp]';
    };
    // 检查数据是否是Null值
    _.isNull = function(obj) {
        return obj === null;
    };
    // 检查数据是否是Undefined(未定义的)值
    _.isUndefined = function(obj) {
        return obj ===
        void 0;
    };
    // 检查一个属性是否属于对象本身, 而非原型链中
    _.has = function(obj, key) {
        return hasOwnProperty.call(obj, key);
    };
    // 工具函数
    // -----------------

    // 放弃_(下划线)命名的Underscore对象, 并返回Underscore对象, 一般用于避免命名冲突或规范命名方式
    // 例如:
    // var us = _.noConflict(); // 取消_(下划线)命名, 并将Underscore对象存放于us变量中
