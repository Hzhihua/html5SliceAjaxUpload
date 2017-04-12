/*
    2017年4月5日 星期三
    黄志华
*/
(function($) {
    $.fn.html5SliceUpload = function(opts) {

        var defaults = {
            fileTypeExts: '',
            //允许上传的文件类型，填写mime类型
            url: '',
            //文件提交的地址
            file_num: 5,
            // 上传文件数量限制(0无限制)
            step: 5 * 1024 * 1024,
            // 每次切割上传5M文件 
            auto: false,
            //自动上传
            multi: true,
            //默认允许选择多个文件
            buttonText: '选择/拖拽文件',
            //上传按钮上的文字
            removeTimeout: 0,
            //上传完成后进度条的消失时间(删除进度条)
            itemTemplate: '<li id="${fileID}file"><div class="progress"><div class="progressbar"></div></div><span class="upload_percent">0%</span><span class="filename">${fileName}</span><span class="progressnum">0/${fileSize}</span><a class="uploadbtn">上传</a><a class="delfilebtn">删除</a></li>',
            //上传队列显示的模板,最外层标签使用<li>
            uploadClick: $('#upload'),
            upButton: $('input[type="submit"]'),
            onUploadStart: function() {},
            //上传开始时的动作
            onUploadSuccess: function() {},
            //上传成功的动作
            onUploadComplete: function() {},
            //上传完成的动作
            onUploadError: function(file, text) {},
            //上传失败的动作
            onInit: function() {},
            //初始化时的动作
            onNumEnough: function(num){alert('上传文件数量达到限制：'+num)},
            //上传数量达到限制
        }

        var option = $.extend(defaults, opts);

        //将文件的单位由bytes转换为KB或MB
        var formatFileSize = function(size) {
            if (size > 1024 * 1024) {
                size = (Math.round(size * 100 / (1024 * 1024)) / 100).toString() + 'MB';
            } else {
                size = (Math.round(size * 100 / 1024) / 100).toString() + 'KB';
            }
            return size;
        }

        /**
         * 根据files["index"]序号获取文件
         * @param  {int} index 文件序号 
         * @param  {array}  files 文件总数组
         * @return {array/boolen}       返回文件数组/false
         */
        var getFile = function(index, files) {
            for(file of files){
                if(("index" in file) && file["index"] == index){
                    return file;
                }
            }
            return false;
        }

        // 将数组的index序号重小到大重新排序
        var fileIndexRank = function(files) {
            var time = new Date().getTime();
            for (var num = 0; num < files.length; num++) {
                if("index" in files[num]){
                    files[num].index = num;
                    files[num].uploadComplete = 0;
                    // 时间不存在时才添加
                    if(!files[num].time){
                        files[num].time = time + num*1000;
                    }
                    
                }
            }
            return files;
        }

        /**
         * 判断文件files是否已经添加在files_total数组里
         * @param  {array} files       需要判断的变量
         * @param  {array} files_total 是否存在此变量里
         * @param  {string} property   属性名称
         * @return {bool}              存在返回真 不存在返回假
         */
        var fileIsExists = function(files, files_total, property) {
            var files_length = files_total.length;

            if (files_length) {
                for (var n = 0; n < files_length; n++) {
                    if (files[property] == files_total[n][property]) {
                        return true;
                    }
                }
            }

            return false;
        }

        /**
         * 判断选择的文件是否达到上传数量限制
         * @param  {array} files 文件总数组
         * @return {bool}        达到限制true/未达到false
         */
        var fileNumIsEnough = function(num ,files) {
            var filesNum = 0;
            for(file of files){
                if("index" in file){
                    filesNum++;
                }
            }
            if( ((num+filesNum) > option.file_num) && (option.file_num > 0)){
                return true;
            }else{
                return false;
            }
        }

        //将文件类型格式化为数组
        var formatFileType = function(str) {
            if (str) {
                return str.split(",");
            }
            return false;
        }

        this.each(function() {
            var _this = $(this);
            //先添加上file按钮和上传列表
            var inputstr = '<input class="uploadfile" style="visibility:hidden;" type="file" name="fileselect[]"';
            if (option.multi) {
                inputstr += 'multiple';
            }
            inputstr += '/>';
            inputstr += '<a href="javascript:void(0)" class="uploadfilebtn">';
            inputstr += option.buttonText;
            inputstr += '</a>';
            var fileInputButton = $(inputstr);
            var uploadClick = option.uploadClick;
            // var uploadFileList = $('<ul class="filelist"></ul>');
            // _this.append(fileInputButton,uploadFileList);
            uploadClick.html(fileInputButton);
            //创建文件对象
            var HUAFILE = {
                fileInput: fileInputButton.get(0),
                //html file控件
                files_total: [],
                //存放选择文件后file参数
                files_index: 0,
                // 文件序号
                upButton: option.upButton,
                //提交按钮
                url: option.url,
                //ajax地址
                fileFilter: [],
                //过滤后的文件数组
                ajax_upload: [],
                //记录setInterval进程id
                filter: function(files) {
                    //选择文件组的过滤方法
                    var arr = [];
                    var typeArray = formatFileType(option.fileTypeExts);
                    if (!typeArray) {
                        for (var i in files) {
                            if (files[i].constructor == File) {
                                arr.push(files[i]);
                            }
                        }
                    } else {
                        for (var i in files) {
                            if (files[i].constructor == File) {
                                if ($.inArray(files[i].type, typeArray) >= 0) {
                                    arr.push(files[i]);
                                } else {
                                    alert('文件类型不允许！');
                                    fileInputButton.val('');
                                }
                            }
                        }
                    }
                    return arr;
                },
                //文件选择后
                onSelect: option.onSelect || function(files) {
                    if (files.length) {
                        var time = new Date().getTime();
                        for (var k = 0; k < files.length; k++) {
                            // 已经添加了的文件不再重复添加
                            var file = files[k];

                            var html = option.itemTemplate;
                            //处理模板中使用的变量
                            html = html.replace(/\${fileID}/g, HUAFILE.files_index).replace(/\${fileName}/g, file.name).replace(/\${fileSize}/g, formatFileSize(file.size));

                            // uploadFileList.append(html);
                            $('#showFileList').append(html);
                            
                           // 处理重复选中文件的问题
                           if (fileIsExists(file, HUAFILE.files_total, 'name')) {
                               // 文件被重复选中时，即使没有被添加到上传列表
                               // 也会改变file属性的值  所以要对file的属性index重新排序
                               HUAFILE.files_total = fileIndexRank(HUAFILE.files_total);
                               continue;
                           }

                           // 将新添加的文件加入文件总数组 尾
                           HUAFILE.files_total.push(file);
                           // 对file数组的index属性重新赋值  
                           // index属性会随添加文件自动变值
                           HUAFILE.files_total = fileIndexRank(HUAFILE.files_total); 
                            //判断是否是自动上传
                            if (option.auto) {
                                HUAFILE.funUploadFile(getFile(HUAFILE.files_index, HUAFILE.files_total));
                                (HUAFILE.upButton).attr('disabled', 'disabled');
                            }

                            HUAFILE.files_index++;

                        }

                    }
                    //如果配置非自动上传，绑定上传事件
                    if (!option.auto) {
                        $('.uploadbtn').unbind().die().bind('click', function() {
                            var index = parseInt($(this).parent('li').attr('id'));
                            // 重复点击  清楚之前的进程
                            clearInterval(HUAFILE.ajax_upload[file.index]);
                            HUAFILE.funUploadFile(getFile(index, HUAFILE.files_total));
                            $(this).siblings('.delfilebtn').unbind();
                            (HUAFILE.upButton).attr('disabled', 'disabled');
                        });
                    }
                    //为删除文件按钮绑定删除文件事件
                    $('.delfilebtn').die().bind('click', function() {
                        var index = parseInt($(this).parent('li').attr('id'));
                        HUAFILE.funDeleteFile(index);
                    });

                }
                ,
                //删除文件html样式
                onDelete: function(index) {
                    // $('#' + index + 'file').fadeOut(200);
                    $('#' + index + 'file').remove();
                },
                onProgress: function(file, loaded, total) {
                    var eleProgress = $('#' + file.index + 'file .progress')
                      , percent = (loaded / total * 100).toFixed(2) + '%';
                    if(loaded >= total){percent = '100%';}
                    eleProgress.find('.progressbar').css('width', percent);
                    if(total-loaded<500000){loaded = total;}//解决四舍五入误差
                    eleProgress.parents('li').find('.progressnum').html(formatFileSize(loaded) + '/' + formatFileSize(total));
                    eleProgress.parents('li').find('.upload_percent').html(percent);
                    if (loaded >= total) {
                        if (option.removeTimeout > 0) {
                            setTimeout(function() {
                                HUAFILE.onDelete(file.index)
                            }, option.removeTimeout);
                        }
                    }
                },
                //文件上传进度
                onUploadSuccess: option.onUploadSuccess,
                //文件上传成功时
                onUploadError: option.onUploadError,
                //文件上传失败时,
                onUploadComplete: option.onUploadComplete,
                //文件全部上传完毕时

                /* 开发参数和内置方法分界线 */

                //获取选择文件，file控件或拖放
                funGetFiles: function(e) {

                    // 获取文件列表对象
                    var files = e.target.files || e.dataTransfer.files;
                    if(fileNumIsEnough(files.length, HUAFILE.files_total)){
                        option.onNumEnough(option.file_num);
                        return;
                    }
                    //继续添加文件
                    files = this.filter(files)
                    this.fileFilter.push(files);
                    this.funDealFiles(files);
                    return this;
                },

                //选中文件的处理与回调
                funDealFiles: function(files) {
                    var fileCount = _this.find('.filelist li').length;
                    //队列中已经有的文件个数
                    for (var i = 0; i < this.fileFilter.length; i++) {
                        for (var j = 0; j < this.fileFilter[i].length; j++) {
                            var file = this.fileFilter[i][j];
                            //增加唯一索引值
                            file.index = ++fileCount;
                        }
                    }
                    //执行选择回调
                    this.onSelect(files);

                    return this;
                },

                /**
                 * 在文件总数组中删除对应的文件
                 * @param  {int} num 删除文件的序号
                 * @return {object}  this
                 */
                funDeleteFile: function(num) {
                    for(file of HUAFILE.files_total){
                        if (("index" in file) && file['index'] == num) {
                            HUAFILE.files_total[num] = [];
                            this.onDelete(num);
                            return this;
                        }
                    }
                    return this;
                },

                /**
                 * 判断文件是否全部上传完
                 * @return {boolen} [上传完true/未上传完false]
                 */
                funUploadComplete: function(){
                    for(file of HUAFILE.files_total){
                        if(('uploadComplete' in file) && !file.uploadComplete){
                           return false;
                        }
                    }

                    return true;
                },

                /**
                 * 定时调用文件上传
                 * @param  {array} file 上传文件数据
                 */
                funUploadFile: function(file) {
                    if(file){
                        HUAFILE.ajax_upload[file.index] = setInterval((HUAFILE.html5_ajax_slice_upload(file)), 1000);
                    }
                },

                /**
                 * html5切割文件+ajax异步上传
                 * @param  {array} file 上传文件数据
                 */
                html5_ajax_slice_upload: function(file) {
                    var self = this;
                    //步长
                    // var step  = 10*1024*1024;
                    var step = option.step;
                    //切割起点
                    var begin = 0;
                    //切割结束点
                    var end = begin + step;
                    //允许下个blob上传
                    var go = true;
                    //文件总大小
                    var size = 0;
                    //数据对象
                    var data = null;
                    //分割的文件
                    var blob = null;
                    //总共上传的数据大小
                    var total_loaded = 0;
                    //单次上传的数据大小
                    var tmp_loaded = 0;
                    // 上传出错
                    var error = 0;
                    return function() {
                        if (go == false || error){
                            clearInterval(HUAFILE.ajax_upload[file.index]);
                            return;
                        }
                        //文件总大小
                        size = file.size;
                        //当起始点超过文件总大小,退出上传.
                        if (begin > size) {
                            clearInterval(HUAFILE.ajax_upload[file.index]);
                            //切割起点
                            begin = 0;
                            //切割结束点
                            end = begin + step;
                            //允许下个blob上传
                            // go  = true;
                            //不允许下个blob上传
                            go = false;
                            return;
                        }
                        //XML对象
                        xhr = new XMLHttpRequest();
                        // 设置超时请求时间
                        // xhr.timeout = option.ajax_timeout;
                        // 请求超时处理
                        // xhr.ontimeout = function() {
                        //     go = false;
                        //     self.onProgress(file, 0, size);
                        //     if (!error) {
                        //         self.onUploadError(file, '网络请求超时');
                        //         error = 1;
                        //     }
                        //     return;
                        // }
                        // 上传中
                        // xhr.upload.addEventListener("progress", function(e) {
                            // 计算单个文件总共上传了多少单位数据
                            // 如果单次上传的数据没有上传完，此函数会被重复执行
                            // 直到单次上传的数据上传完为止
                            // tmp_loaded = e.loaded;
                        // }, false);
                        
                        // 文件上传成功或是失败
                        xhr.onreadystatechange = function(e) {
                            if (xhr.readyState == 4) {
                                if (xhr.status == 200) {
                                    // console.log(xhr.responseText);
                                    self.onUploadSuccess();
                                    // 累计次文件总共上传的数据大小
                                    // total_loaded += tmp_loaded;
                                    total_loaded += parseInt(xhr.responseText);
                                    // 显示上传进度
                                    self.onProgress(file, total_loaded, size);
                                    //计算下次切割点
                                    begin = end;
                                    end = begin + step;
                                    //允许下个blob上传
                                    go = true;

                                    if(total_loaded == size){
                                        HUAFILE.files_total[file.index]['uploadComplete'] = 1;
                                        var bool = self.funUploadComplete();
                                        if(bool){
                                            HUAFILE.upButton.removeAttr('disabled');
                                        }else{
                                            HUAFILE.upButton.attr('disabled', 'disabled');
                                        }
                                    }

                                    self.onUploadComplete();

                                }
                                // else {
                                //  self.onUploadError(file, xhr.responseText);     
                                // }
                            }
                        };

                        option.onUploadStart();
                        //建立连接   true异步   false同步
                        xhr.open('POST', self.url, false);
                        //分割文件
                        blob = file.slice(begin, end);
                        //数据对象                       
                        data = new FormData();
                        data.append('files', blob, file['name']);
                        // 文件唯一标识
                        data.append('fileName', file['time']);  
                        // 用于后台判断文件是否上传完
                        data.append('fileSize', size); 
                        data.append('first', !total_loaded);
                        //发送
                        xhr.send(data);
                    };

                },

                init: function() {
                    var self = this;

                    //文件选择控件选择
                    if (this.fileInput) {
                        this.fileInput.addEventListener("change", function(e) {
                            self.funGetFiles(e);
                        }, false);
                    }

                    var dropFile = document.getElementById("dropFile");
                    dropFile.ondragenter = function(e) {
                        e.preventDefault();
                    }
                    dropFile.ondragover = function(e) {
                        e.preventDefault();
                    }
                    dropFile.ondragleave = function(e) {
                        e.preventDefault();
                    }
                    dropFile.ondrop = function(e) {
                        e.preventDefault();
                        self.funGetFiles(e);
                    }

                    $('input[type="submit"]').click(function(){
                        $('#upload').find('input').remove();
                    });

                    //点击上传按钮时触发file的click事件
                    _this.find('.uploadfilebtn').live('click', function() {
                        _this.find('.uploadfile').trigger('click');
                    });

                    option.onInit();
                }
            };
            //初始化文件对象
            HUAFILE.init();

        });
    }

})(jQuery);
