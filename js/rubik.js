(function(){

    var userAgent = navigator.userAgent.toLowerCase(),
    prefix = cssPref = "";

    //stupid browser compatibility prefix
    if(/webkit/gi.test(userAgent)){
        prefix = "-webkit-";
        cssPref = "Webkit";
    }else if(/msie | trident/gi.test(userAgent)){
        prefix = "-ms-";
        cssPref = "ms";
    }else if(/mozilla/gi.test(userAgent)){
        prefix = "-moz-";
        cssPref = "Moz";
    }else if(/opera/gi.test(userAgent)){
        prefix = "-o-";
        cssPref = "O";
    }else{
        prefix = "";
        cssPref = "";
    }

    //判断浏览器支持那种transform的写法;
    var trsfm = (cssPref+"Transform" in document.documentElement.style) ? cssPref+"Transform" : "transform";
     
    // simple browser compatible requestAnimFrame & canvelAnimFrame
    var requestAnimFrame = (function(){
        return  window[cssPref+"RequestAnimationFrame"] || 
        function(callback){
            window.setTimeout(callback, 1000/60);    // 16.7ms display frequency displayed on most monitors
        };
    })();

    var cancelAnimFrame = (function(){
        return  window[cssPref+"CancelRequestAnimationFrame"] || 
        clearTimeout;
    })();

    // 绑定事件
    function bindEvent(target, type, callback, remove, propa){
        var remove = arguments[3] || "add",
            propagation = arguments[4] || false;
        target[remove+"EventListener"](type, callback, propagation);
    }

    // 计算两个matrix3d的乘积，其实是长度16的数组相乘
    function multiplyMatrix(m1, m2){
        var matrix = [];
    
        matrix[0]   = m1[0]*m2[0]+m1[1]*m2[4]+m1[2]*m2[8]+m1[3]*m2[12];
        matrix[1]   = m1[0]*m2[1]+m1[1]*m2[5]+m1[2]*m2[9]+m1[3]*m2[13];
        matrix[2]   = m1[0]*m2[2]+m1[1]*m2[6]+m1[2]*m2[10]+m1[3]*m2[14];
        matrix[3]   = m1[0]*m2[3]+m1[1]*m2[7]+m1[2]*m2[11]+m1[3]*m2[15];
        matrix[4]   = m1[4]*m2[0]+m1[5]*m2[4]+m1[6]*m2[8]+m1[7]*m2[12];
        matrix[5]   = m1[4]*m2[1]+m1[5]*m2[5]+m1[6]*m2[9]+m1[7]*m2[13];
        matrix[6]   = m1[4]*m2[2]+m1[5]*m2[6]+m1[6]*m2[10]+m1[7]*m2[14];
        matrix[7]   = m1[4]*m2[3]+m1[5]*m2[7]+m1[6]*m2[11]+m1[7]*m2[15];
        matrix[8]   = m1[8]*m2[0]+m1[9]*m2[4]+m1[10]*m2[8]+m1[11]*m2[12];
        matrix[9]   = m1[8]*m2[1]+m1[9]*m2[5]+m1[10]*m2[9]+m1[11]*m2[13];
        matrix[10]  = m1[8]*m2[2]+m1[9]*m2[6]+m1[10]*m2[10]+m1[11]*m2[14];
        matrix[11]  = m1[8]*m2[3]+m1[9]*m2[7]+m1[10]*m2[11]+m1[11]*m2[15];
        matrix[12]  = m1[12]*m2[0]+m1[13]*m2[4]+m1[14]*m2[8]+m1[15]*m2[12];
        matrix[13]  = m1[12]*m2[1]+m1[13]*m2[5]+m1[14]*m2[9]+m1[15]*m2[13];
        matrix[14]  = m1[12]*m2[2]+m1[13]*m2[6]+m1[14]*m2[10]+m1[15]*m2[14];
        matrix[15]  = m1[12]*m2[3]+m1[13]*m2[7]+m1[14]*m2[11]+m1[15]*m2[15];
    
        return matrix;
    }

    // 计算两空间三维向量之间夹角
    function calcAngle(vec0, vec1){
        var numerator = vec0[0]*vec1[0] + vec0[1]*vec1[1] + vec0[2]*vec1[2],
            denominator = Math.sqrt(vec0[0]*vec0[0] + vec0[1]*vec0[1] + vec0[2]*vec0[2])*Math.sqrt(vec1[0]*vec1[0] + vec1[1]*vec1[1] + vec1[2]*vec1[2]),
            angle = Math.acos(numerator/denominator);
        return angle;
    }

    // 向量单位化，可以是任意维向量
    function normalize(vec){
        var len = vec.length, vecLength = 0, norm = [];

        for(var i = 0; i < len; i++){
            vecLength += Math.pow(vec[i], 2);
        }

        vecLength = Math.sqrt(vecLength);

        if(vecLength == 0){
            return false;       //当向量坐标全都为0时，避免出现NaN
        }

        for(var i = 0; i < len; i++){
            norm[i] = vec[i]/vecLength;
        }

        return norm;
    }

    // 两个空间三维向量的叉积，既是旋转轴
    function crossVector(vec0, vec1){
        var res = [];
        if(vec0.length != vec1.length){
            return false;
        }

        res[0] = vec0[1]*vec1[2] - vec0[2]*vec1[1];
        res[1] = vec0[2]*vec1[0] - vec0[0]*vec1[2];
        res[2] = vec0[0]*vec1[1] - vec0[1]*vec1[0];

        return res;
    }

    // get the mouse/touch position
    function touchPos(eventObj){
        var x, y;
        if(eventObj.type.indexOf("mouse")>-1){
            x = eventObj.pageX;
            y = eventObj.pageY;
        }else if(eventObj.type.indexOf("touch")>-1){
            if(eventObj.touches.length === 1 ){
                var touch = eventObj.touches[0];
                x = touch.pageX;
                y = touch.pageY;
            }
        }
        return [x,y];

    }

    //findPos-script by www.quirksmode.org
    function findPos(obj) {
        var curleft = 0,
            curtop  = 0;
    
        if (obj.offsetParent) {
            do {
                curleft += obj.offsetLeft;
                curtop += obj.offsetTop;
            } while (obj = obj.offsetParent);
            
            return [curleft,curtop];
        }
    }

    // get element style
    function getStyle(target, prop){
        var style = document.defaultView.getComputedStyle(target, "");
        return style.getPropertyValue(prop);
    }

    // inerpolate rotate3d vector into a 3d matrix, information from w3 org
    function rotateMatrix(axis, angle){
        var x = axis[0],
            y = axis[1],
            z = axis[2],
            a = angle,
            sc = Math.sin(a) / 2,
            sq = Math.sin(a/2)*Math.sin(a/2),
            matrix = [1-2*(y*y + z*z)*sq, 2*(x*y*sq + z*sc), 2*(x*z*sq - y*sc), 0, 2*(x*y*sq - z*sc), 1-2*(x*x+z*z)*sq, 2*(y*z*sq + x*sc), 0, 2*(x*z*sq + y*sc), 2*(y*z*sq - x*sc), 1-2*(x*x + y*y)*sq, 0, 0, 0, 0, 1];
        return matrix;
    }

    //试用无效，暂时放在这里。检索是否存在符合条件的元素，有返回true没有返回false
    function matchesSelector(element, selector){  
        if (element.matchesSelector){ 
            return element.matchesSelector(selector); 
        } else if (element.msMatchesSelector){ 
            return element.msMatchesSelector(selector); 
        } else if (element.mozMatchesSelector){ 
            return element.mozMatchesSelector(selector); 
        } else if (element.webkitMatchesSelector){ 
            return element.webkitMatchesSelector(selector); 
        } else { 
            throw new Error("matchesSelector not supported."); 
        } 
    }

    /**
     * [getFace 获取立方体一个面的class]
     * @param  {[string]} string [className]
     * @return {[string]}        [back|left|right|top|bottom|front]
     */
    function getFace(string){
        var face = string.match(/back|left|right|top|bottom|front/)[0];
        return face;
    }

    /**
     * [in_array 检查数组中是否有某一项]
     * @param  {[type]} e [description]
     * @return {[type]}   [description]
     */
    Array.prototype.in_array = function(str)  
    {  
        for(i=0;i<this.length;i++)  
        {  
            if(this[i] == str)  
            return i;  
        }  
        return false;  
    }

    /**
     * [matrixToArr 将matrix3d的字符串转化为数组]
     * @param  {[type]} matrix [description]
     * @return {[type]}        [description]
     */
    function matrixToArr(matrix){
        var arr = [];
        arr = matrix.split(",");

        arr[0] = arr[0].replace(/(matrix3d\()/g, "");
        arr[15] = arr[15].replace(/\)/g, "");

        for(var i = 0, l = arr.length; i<l; i++){
            arr[i] = parseFloat(arr[i]);
        }

        return arr;
    }

    /**
     * [showTrans 显示每个小块的translation3d值]
     * @return {[type]} [description]
     */
    function showTrans(parent){

        var tiles = parent.querySelectorAll('.tile'),
            ar = [];
            
        for (var i = 0; i<tiles.length; i++){
            ar = matrixToArr(getStyle(tiles[i], 'transform'));

            tiles[i].innerHTML = 'x:'+parseInt(ar[12])+'<br>';
            tiles[i].innerHTML += 'y:'+parseInt(ar[13])+'<br>';
            tiles[i].innerHTML += 'z:'+parseInt(ar[14])+'<br>';
        }

    }

    var Rubik = function(confObj){
        this.config = {};
        this.build(confObj);
        this.setup(confObj);
        this.initial();
    };

    /**
     * [build 构建一个魔方，默认尺寸是屏幕宽的0.每一个小块是rubik的0.2。首先给小块赋予row和col的CSS类，主要的原理是让每个元素的初始位置全部在魔方正中，使用默认的trasform-origin:50% 50% 0，之后赋予3d旋转setpos()。这样之后再给每个元素额外增加3d旋转时,他们应该都是围绕魔方正中旋转。]
     * @param  {[type]} confObj [description]
     * @return {[type]}         [description]
     */
    Rubik.prototype.build = function(confObj){
        var THIS = this,
            stage,              //3d变换的空间
            obj,                //实施变换对象
            tiles,
            tamano,             //魔方的比例，默认为宽和高中小的一个的0.4
            rs,                 //魔方的尺寸(px)
            ts;                 //魔方上小块的尺寸，魔方尺寸的0.2

        (function(){

            for(var property in confObj){
                THIS.config[property] = confObj[property];
            }

            THIS.stage = document.getElementById(THIS.config.stage) || document.getElementsByTagName('body')[0];

            if(THIS.config.obj != undefined){
                THIS.obj = document.getElementById(THIS.config.obj[0]);
                if(THIS.obj === null){
                    // 没有找到相应ID的元素
                    return false;
                }
            }else{
                // 未定义3D变换的元素
                return false;
            }

            THIS.tiles = THIS.obj.querySelectorAll('.tile');

            THIS.tamano = (THIS.config.tamano == undefined) ? 0.4 : THIS.config.tamano;

            rs = parseInt(getStyle(THIS.stage, 'width')) > parseInt(getStyle(THIS.stage, 'height')) ? parseInt(getStyle(THIS.stage, 'height')) * THIS.tamano : parseInt(getStyle(THIS.stage, 'width')) * THIS.tamano;
            ts = rs*0.2-2;          //小块的内高度，没有padding
            THIS.tsp = rs * 0.2;         //小块包含padding的高度

            THIS.obj.style['width'] = rs + 'px';
            THIS.obj.style['height'] = rs + 'px';
            THIS.obj.style['margin'] = -rs * 0.5 +"px 0 0 "+(-rs * 0.5)+"px";       //将魔方定位在stage正中

            //赋予每一个面的小块适当的class
            addClass('.back');
            addClass('.left');
            addClass('.right');
            addClass('.top');
            addClass('.bottom');
            addClass('.front');
            
            //将每个小块定位在每一面适当的位置
            setPos(THIS.tiles);
            
        })();

        /**
         * [addClass 一次给一个面的小块添加row和col，并且每一个小块都赋予width,height,top,left。全部都绝对定位在魔方正中]
         * @param {[type]} clas [各个面的class]
         */
        function addClass(clas){
            var eles = THIS.obj.querySelectorAll(clas),
                row,
                col;

            for(var i = 0, j = eles.length; i < j; i++){

                if(i < 4){
                    row = "row1";
                }else if(i >=4 && i < 8){
                    row = "row2";
                }else if(i >=8 && i < 12){
                    row = "row3";
                }else if(i >=12 && i < 16){
                    row = "row4";
                }

                if(i%4 == 0){
                    col = "col1";
                }else if(i%4 == 1){
                    col = "col2";
                }else if(i%4 == 2){
                    col = "col3";
                }else if(i%4 == 3){
                    col = "col4";
                }

                eles[i].classList.add(row);
                eles[i].classList.add(col);

                eles[i].style['width'] = ts + 'px';
                eles[i].style['height'] = ts + 'px';
                eles[i].style['top'] = (rs - THIS.tsp)/2 + 'px';
                eles[i].style['left'] = (rs - THIS.tsp)/2 + 'px';
            }
        }

        /**
         * [setPos 设d为小块的边长，row-x、col-y的位置是translate3d(d*(2.5-y)px, d*(2.5-x)px, (2*d)px)，之后给每个面赋予对应的rotate3d()]
         */
        function setPos(eles){
            
            for(var i = 0, j = eles.length; i<j; i++){
                var clas = eles[i].className,
                    row = clas.match(/row([\d])/)[1],
                    col = clas.match(/col([\d])/)[1],
                    face = clas.match(/back|left|right|top|bottom|front/)[0],
                    rtt3d;

                switch(face){
                    case 'back':
                        rtt3d = "0,1,0,180deg";
                    break;
                    case 'left':
                        rtt3d = "0,1,0,-90deg";
                    break;
                    case 'right':
                        rtt3d = "0,1,0,90deg";
                    break;
                    case 'top':
                        rtt3d = "1,0,0,90deg";
                    break;
                    case 'bottom':
                        rtt3d = "1,0,0,-90deg";
                    break;
                    case 'front':
                        rtt3d = "0,0,0,0deg";
                    break;
                }
                
                eles[i].style[trsfm] = "rotate3d("+rtt3d+") translate3d("+(-THIS.tsp * (2.5-col))+"px,"+(-THIS.tsp * (2.5-row))+"px,"+(THIS.tsp*2)+"px)";
            }

        }
        //Rubik.build end
    }

    /**
     * [Rubik.setup 整体思路
     * step1 页面加载后，先获取stage的top、left，去stage的宽、高中小的一个作为trackball的半径，获取目标元素的transform属性，并将其转换为matrix3d的数组，赋值给startmatrix。并给目标元素绑定mousedown事件。
     * step2 旋转运动开始时，判断元素是否还在运动，若还在运动则停止。更新元素的旋转角度。获取鼠标点击的坐标。解除目标元素的mousedown事件，给document绑定mousemove & mouseup。
     * step3 旋转过程中，根据鼠标移动轨迹计算出每一次的坐标，计算出旋转轴axis和旋转角度angle，通过axis和angle计算出matrix3d，做出动画。
     * step4 旋转结束后，将document上的两个绑定事件mousemove & mouseup解除，重新给目标元素绑定mousedown。判断是否设置了冲量，以及冲量是否大于0，若有冲量计算出角速度omega，角度参数使用1000/60，之后设置减速度。若没有冲量或者冲量耗尽，则去除动画，计算出当前的startmatrix，将angle和omega归0；]
     * @param {[object]} confObj [stage, obj, impulse]
     */
    Rubik.prototype.setup = function(confObj){

        var THIS = this,
            impulse = true,     //if true there will be inertia else if false there will be none
            stagew = 0,         //half of stagewidth
            stageh = 0,         //half of stageheight
            radius = 0,         //visual trackball radius
            pos = 0,            //top & left of the stage
            mouseDownVector = [],    //the vector of the cursor position when the mouse down
            mouseMoveVector = [],    //the vector of the cursor position during the mouse is moving
            axis = [1,1,1],           //rotating axis, calculated by mouseDownVector & mouseMoveVector
            oldAngle = 0,       //旋转实施之前的角度
            angle = 0,          //rotate3d angle旋转的角度
            oldTime = 0,        //鼠标点击时刻的时间
            time = 0,           //鼠标放开时刻的时间
            startMatrix = [],   //starting matrix of every action
            omega = 0,          //单位角速度
            resetMotion = true,       //当鼠标点击目标元素时，是否停止当前运动
            omegaCap,          //单位角速度的cap,必须是大于0的数，默认为0.5
            lambda;             //阻力系数，越大阻力越大，默认0.01
            
        //闭包函数，做初始化魔方之用--------------------------------------------------------开始
        (function init(){
            //将设置参数传给对象
            for(var property in confObj){
                THIS.config[property] = confObj[property];
            }

            if(THIS.config.impulse !== undefined){
                impulse = THIS.config.impulse;
            }

            if(THIS.config.resetMotion !== undefined){
                resetMotion = THIS.config.resetMotion;
            }

            //undefined is NaN
            omegaCap = isNaN(parseFloat(THIS.config.omegaCap)) ? 0.5 : parseFloat(THIS.config.omegaCap);
            lambda = isNaN(parseFloat(THIS.config.lambda)) ? 0.01 : parseFloat(THIS.config.lambda);

            // 旋转空间的top、left
            pos = findPos(THIS.stage);

            stagew = THIS.stage.offsetWidth/2;
            stageh = THIS.stage.offsetHeight/2;
            // 取空间的宽高中小的一个作为trackball半径
            radius = stagew>stageh ? stageh : stagew;
            // 元素最初设置的transform值
            originTransform = getStyle(THIS.obj, prefix + "transform");
            
            if(originTransform == "none"){
                startMatrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
            }else{
                // 将字符串处理成数组
                startMatrix = originTransform.split(",");

                startMatrix[0] = startMatrix[0].replace(/(matrix3d\()/g, "");
                startMatrix[15] = startMatrix[15].replace(/\)/g, "");

                for(var i = 0, l = startMatrix.length; i<l; i++){
                    startMatrix[i] = parseFloat(startMatrix[i]);
                }
            }
            // 目标元素绑定mousedown事件
            bindEvent(THIS.obj, "mousedown", rotateStart);

        })();
        //闭包函数，做初始化魔方之用--------------------------------------------------------结束

        //跟随鼠标3d转动部分需要用到的函数--------------------------------------------------------开始
        // 旋转开始阶段，计算出鼠标点击时刻的坐标，并由此计算出点击时的空间三维向量，初始化时间和角度，在目标元素上移除事件，在document上绑定事件
        function rotateStart(e){
            if (resetMotion && omega !== 0) {stopMotion()};    //如果之前的惯性没有耗尽，停止运动
            //非常重要，如果没有这一句，会出现鼠标点击抬起无效
            e.preventDefault();
            mouseDownVector = calcZ(touchPos(e));
            // 获得当前已旋转的角度
            oldAngle = angle;

            oldTime = new Date().getTime();
            // 绑定三个事件
            bindEvent(THIS.obj, "mousedown", rotateStart, "remove");
            bindEvent(document, "mousemove", rotate);
            bindEvent(document, "mouseup", rotateFinish);

        }

        // 旋转函数，计算鼠标经过位置的向量，计算旋转轴，旋转的角度，请求动画，更新每一帧的时间
        function rotate(e){
            //非常重要，如果没有这一句，会出现鼠标点击抬起无效
            e.preventDefault();
            // 计算鼠标经过轨迹的空间坐标
            mouseMoveVector = calcZ(touchPos(e));

            //当mouseMoveVector == mouseDownVector时（点击事件，有时候不是点击事件也会出现这种情况，有待进一步调查），向量单位化会出现分母为0的状况，这样便可以避免出现axis里面有NaN的情况，解决了卡死问题。
            if(mouseMoveVector[0] == mouseDownVector[0] && mouseMoveVector[1] == mouseDownVector[1] && mouseMoveVector[2] == mouseDownVector[2]){
                return false;
            }

            // 一下这段会使在计算惯性运动时，只计算最后一个转动帧里的角度变化，而不是从鼠标点下起的角度变化，比较符合实际的运动模型。
            oldAngle = angle;
            // 旋转轴为空间向量的叉积
            axis = crossVector(mouseDownVector, mouseMoveVector);
            axis = normalize(axis);
            // 旋转的角度
            angle = calcAngle(mouseDownVector, mouseMoveVector);
    
            requestAnimFrame(slide);
        }

        /**
         * [rotateFinish 旋转结束，移除document上的两个绑定事件mousemove & mouseup，重新给目标元素绑定事件mousedown，计算初始矩阵，取消动画]
         * @param  {[type]} e [event]
         * @return {[type]}   [description]
         */
        function rotateFinish(e){
            
            // 当第一下为点击时，axis还是空数组，会出现计算出的startMatrix包含NaN的情况，所以在这里解除绑定的事件并且结束流程。其实可以不需要判断里面的数字是否为NaN，在前面rotate哪里已经把这种情况预防了，在这里只是以防万一
            if(axis.length == [] || isNaN(axis[0]) || isNaN(axis[1]) || isNaN(axis[2])){
                bindEvent(document, 'mousemove', rotate, "remove");
                bindEvent(document, 'mouseup', rotateFinish, "remove");
                bindEvent(THIS.obj, 'mousedown', rotateStart);
                return false;
            }

            bindEvent(document, 'mousemove', rotate, "remove");
            bindEvent(document, 'mouseup', rotateFinish, "remove");
            bindEvent(THIS.obj, 'mousedown', rotateStart);

            time = new Date().getTime();

            angularDeceleration(); //计算单位角速度

            if (impulse && omega > 0) {
                cancelAnimFrame(slide);
                requestAnimFrame(deceleration);     //有单位角速度做惯性运动
            }else{
                stopMotion();
            }

            //what's the condition mean? to be found out..
            // else if(!(isNaN(axis[0]) || isNaN(axis[1]) || isNaN(axis[2]))){
            //     stopMotion();
            // }
        }

        // 使用动画
        function slide(){
            THIS.obj.style[cssPref+"Transform"] = "rotate3d("+ axis+","+angle+"rad) matrix3d("+startMatrix+")";
            requestAnimFrame(slide);
        }

        /**
         * [angularDeceleration 计算鼠标抬起后的单位角速度]
         * @return {[number]} [omega]
         */
        function angularDeceleration(){
            var da = angle - oldAngle,      //鼠标点下到放开转动的角度
                dt = time - oldTime;        //鼠标点下到放开经过的事件
                
            omega = Math.abs(da*(1000/60)/dt);  //算出单位单位角速度，参数1000/60
       
            // 若设置了最大单位角速度，则单位角速度不得超过
            if(isNaN(omega)){
                omega = 0;
            }else if(omegaCap > 0 && omega > omegaCap){
                omega = omegaCap;
            }
        }

        /**
         * [deceleration 计算鼠标抬起后的角减速运动]
         * @return {[type]} [description]
         */
        function deceleration(){
            angle += omega;
            decel = lambda*Math.sqrt(omega);
            omega = omega > 0 ? omega - decel : 0;

            THIS.obj.style[cssPref+"Transform"] = "rotate3d("+ axis+","+angle+"rad) matrix3d("+startMatrix+")";
            
            if(omega === 0){
                stopMotion();
            }else{
                requestAnimFrame(deceleration);
            }
        }

        /**
         * [stopMotion 运动停止后的一系列动作,获得开始矩阵，并且将角度和omega设为0]
         * @return {[type]} [description]
         */
        function stopMotion(){
            cancelAnimFrame(slide);
            cancelAnimFrame(deceleration);

            var stopMatrix = [];
            // 获得运动停止时的矩阵，并且赋值给startMatrix
            stopMatrix  = rotateMatrix(axis, angle);                //结束时的axis & angle
            startMatrix = multiplyMatrix(startMatrix,stopMatrix);
    
            //次初始化步骤一定是在获得startMatrix之后，否则运动停止之后元素会回到ratate3d(x,y,x,0)的位置
            oldAngle = angle = 0;
            omega = 0;
        }

        // calculate the z-component for a space vector
        function calcZ(touchPos){

            var x = (touchPos[0] - pos[0])/radius - 1,
                y = (touchPos[1] - pos[1])/radius - 1,
                z = 1 - x*x -y*y;

            return [x, y, z];
        }
        //跟随鼠标3d转动部分需要用到的函数--------------------------------------------------------结束
        
        //Rubik.setup end
    }

    /**
     * [initial 魔方转动]
     * @return {[type]} [description]
     */
    Rubik.prototype.initial = function(){
        var THIS = this,
            actile,                  //所有此次转动中应用的元素NodeList，length是16或32
            aniLoop,                //requestAnimationFrame变量
            gap = 0.001,            //两个浮点数可能不完全相等，设定一个区间
            clock = 0,              //动画的计数器，到90结束
            param = [],             //记录translation信息的数组
            d,                      //转动的方向，+1或-1
            tClass = 'boxShadow';   //点击小块增加的class

        (function init(){

            bindEvent(document, "click", miniClick);

        })();

        //模拟魔方转动部分需要用到的函数--------------------------------------------------------开始
        /**
         * [miniClick 模仿上小块的点击事件回调函数，获取和验证点击的哪一个面的元素，点击的小块位置和点击的小块顺序]
         * @param  {[type]} e [event]
         * @return {[type]}   [description]
         */
        function miniClick(e){
            var target = e.target;

            //如果没有点击小块则返回false
            if(target.classList.contains("tile")){
                
                //判断之前是否有点击过小块，没有的话只给点击的小块加上boxShadow，有的话进一步判断
                if(THIS.obj.querySelector('.'+tClass) != null){

                    //如果有一个以上小块拥有boxShaow，则false。通常不会出现
                    if(THIS.obj.querySelectorAll('.'+tClass).length > 1){
                        return false;
                    }
                    //去的之前点击的小块
                    var prevEle = THIS.obj.querySelector('.'+tClass);
                    //如果当先小块和之前小块相等，false
                    if(prevEle === target){
                        return false;
                    }

                    var prevArr = matrixToArr(getStyle(prevEle, 'transform')),      //读取之前小块的位置信息
                        arr = matrixToArr(getStyle(target, 'transform'));           //读取当前小块的位置信息

                    var ptr = [prevArr[12], prevArr[13], prevArr[14]],              //之前小块的translation信息
                        ctr = [arr[12], arr[13], arr[14]];                          //当前小块的translation信息
                    
                    for(var i = 0; i<3; i++){
                        //translation中相等的一项，并且这一项不等于小块的边长两倍
                        if(Math.abs(ptr[i] - ctr[i]) < gap && Math.abs(Math.abs(ctr[i]) - THIS.tsp*2) > gap)
                        {
                            param[0] = i;
                            param[1] = ctr[i];
                        }else if(Math.abs(ptr[i] - ctr[i]) > gap){//translation中不相等的一项，指向转动方向
                            param[2] = ptr[i];
                            param[3] = ctr[i];
                        }else if(Math.abs(Math.abs(ctr[i]) - THIS.tsp*2) < gap){//translation中等于小块两倍边长的一项用来调整转动方向
                            param[4] = i;
                            param[5] = ctr[i];
                        }
                    }

                    if(param[0] === undefined){
                        return false;           //param[0]未定义说明点击的不是同一个面
                    }

                    d = (param[2] - param[3])/Math.abs(param[2] - param[3]);        //设定转动+1h | -1

                    //param[0]规定转动轴
                    switch(param[0]){
                        case 0:
                            if((param[4] == 2 && param[5] < 0) || (param[4] == 1 && param[5] > 0)){
                                d = -d;
                            }
                            d = 'X('+d;
                            break;
                        case 1:
                            if((param[4] == 2 && param[5] > 0) || (param[4] == 0 && param[5] < 0)){
                                d = -d;
                            }
                            d = 'Y('+d;
                            break;
                        case 2:
                            if((param[4] == 0 && param[5] > 0) || (param[4] == 1 && param[5] < 0)){
                                d = -d;
                            }
                            d = 'Z('+d;
                            break;
                    }

                    //获得本次转动中应用的小块
                    actile = getTiles();
                    
                    prevEle.classList.remove(tClass);

                    //转动过程中，去除事件。
                    bindEvent(document,'click',miniClick,'remove');
                    //加上动画
                    aniLoop = requestAnimationFrame(girar);
                    
                }else{
                    target.classList.toggle(tClass);
                }

            }else{
                //点击在屏幕的其它位置，则去掉tClass
                if(THIS.obj.querySelector('.'+tClass) != null){
                    THIS.obj.querySelector('.'+tClass).classList.remove(tClass);
                }

                if(target.id == 'reset'){
                    THIS.build();
                }else if(target.id == 'shuffle'){
                    THIS.shuffle();
                }
            }

        }

        /**
         * [getTiles 获取每次转动需要涉及到的小块，分为纵向点击和横向点击两种情况]
         * @return {[arr]} [数组长度为16或者32。依次是本次转动各个面的小块元素。如果长度是32，后16个元素是一整个面的元素]
         */
        function getTiles(){
            var r = [],
                a;
                
            for(var i = 0; i < THIS.tiles.length; i++){
                a = matrixToArr(getStyle(THIS.tiles[i], 'transform'))[12+param[0]];
                // 其他元素中，那些有和点击的两小块相同的一项translation，则选中
                if(Math.abs(a-param[1]) < gap){
                    r.push(THIS.tiles[i]);
                }
                // 如果点击的两小块相同的那一项translation约等于小块边长的1.5倍，则认为这两小块与另外一边相邻，并且相邻的那一边中与这两小块对应的那一项translation值为边长*2，并且与param[1]同号
                if(Math.abs(Math.abs(param[1])-THIS.tsp*1.5) < gap && Math.abs(a*param[1]/Math.abs(param[1]) - THIS.tsp*2) < gap){
                    r.push(THIS.tiles[i]);
                }
            }                

            return r;
        }

        /**
         * [girar description]
         * @return {[type]} [description]
         */
        function girar(){
            aniLoop = requestAnimationFrame(girar);

            for(var i = 0; i<actile.length;i++){
                var m=getStyle(actile[i], 'transform');
                actile[i].style[trsfm] = 'rotate'+d+'deg) '+m;
            }
            
            clock++;
            
            if (clock >= 90) {
                cancelAnimationFrame(aniLoop);

                bindEvent(document,'click',miniClick);
                param = [];
                clock = 0;
            }
        }

        //模拟魔方转动部分需要用到的函数--------------------------------------------------------结束

        //Rubik.initial end
    }

    /**
     * [shuffle  打乱魔方]
     * @return {[type]} [description]
     */
    Rubik.prototype.shuffle = function(){

        var THIS=this, 
            a = 0,
            m,
            gap = 0.001,
            xyz = parseInt(Math.random()*3+12),
            d = Math.random() >= 0.5?90:-90,
            p = THIS.tsp * (parseInt(Math.random()*4)-1.5),
            str = '';
            
            switch(xyz){
                case 12:
                    str = 'rotateX('+d+'deg) ';
                    break;
                case 13:
                    str = 'rotateY('+d+'deg) ';
                    break;
                case 14:
                    str = 'rotateZ('+d+'deg) ';
                    break;
            }

            for(var i = 0; i < THIS.tiles.length; i++){
                m = getStyle(THIS.tiles[i], 'transform');
                a = matrixToArr(m)[xyz];

                if(Math.abs(a-p) < gap){
                    THIS.tiles[i].style[trsfm] = str+m;
                }

                if(Math.abs(Math.abs(p)-THIS.tsp*1.5) < gap && Math.abs(a*p/Math.abs(p) - THIS.tsp*2) < gap){
                    THIS.tiles[i].style[trsfm] = str+m;
                }
            }                

    }       //Rubik.shuffle end

    window.Rubik = Rubik;

})();
