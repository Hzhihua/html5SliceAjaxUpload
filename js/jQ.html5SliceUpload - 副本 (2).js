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
            step: 3 * 1024 * 1024,
            // 每次切割上传5M文件 
            auto: false,
            //自动上传
            multi: true,
            //默认允许选择多个文件
            buttonText: '选择/拖拽文件',
            //上传按钮上的文字
            removeTimeout: 1000,
            //上传完成后进度条的消失时间
            itemTemplate: '<li id="${fileID}file"><div class="progress"><div class="progressbar"></div></div><span class="upload_percent">0%</span><span class="filename">${fileName}</span><span class="progressnum">0/${fileSize}</span><a class="uploadbtn">上传</a><a class="delfilebtn">删除</a></li>',
            //上传队列显示的模板,最外层标签使用<li>
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

        // 根据files数组序号获取文件
        var getFile = function(index, files) {
            for (var i = 0; i < files.length; i++) {
                if (i == index) {
                    return files[i];
                }
            }
            return false;
        }

        // 将数组的index序号重小到大重新排序
        var fileIndexRank = function(files) {
            for (var num = 0; num < files.length; num++) {
                files[num].index = num;
                var time = new Date().getTime();
                files[num].time = time + num*1000;

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
                    	// 显示隐藏的已经添加的文件
                    	$('#'+n+'file').show();
                        return true;
                    }
                }
            }

            return false;
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
            var uploadClick = $('#upload');
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
                upButton: null,
                //提交按钮
                url: option.url,
                //ajax地址
                fileFilter: [],
                //过滤后的文件数组
                ajax_upload: null,
                // setInterval返回实数
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
                        for (var k = 0; k < files.length; k++,
                        HUAFILE.files_index++) {
                            // 已经添加了的文件不再重复添加
                            var file = files[k];

                            // 处理重复选中文件的问题
                            if (fileIsExists(file, HUAFILE.files_total, 'name')) {
                                // 文件被重复选中时，即使没有被添加到上传列表
                                // 也会改变file属性的值  所以要对file属性的index重新排序
                                HUAFILE.files_total = fileIndexRank(HUAFILE.files_total);
                                continue;
                            }

                            // 将新添加的文件加入文件总数组 尾
                            HUAFILE.files_total.push(file);
                            // 对file数组的index属性重新赋值  
                            // index属性会随添加文件自动变值
                            HUAFILE.files_total = fileIndexRank(HUAFILE.files_total);

                            var html = option.itemTemplate;
                            //处理模板中使用的变量
                            html = html.replace(/\${fileID}/g, HUAFILE.files_index).replace(/\${fileName}/g, file.name).replace(/\${fileSize}/g, formatFileSize(file.size));

                            // uploadFileList.append(html);
                            $('#showFileList').append(html);
                            //判断是否是自动上传
                            if (option.auto) {
                                HUAFILE.funUploadFile(file);
                            }

                        }

                    }
                    //如果配置非自动上传，绑定上传事件
                    if (!option.auto) {
                        // _this.find('.uploadbtn').die().live('click',function(){
                        $(document).die().delegate('.uploadbtn', 'click', function() {
                        // $('.uploadbtn').die().live('click', function() {
                            var index = parseInt($(this).parent('li').attr('id'));
                            HUAFILE.funUploadFile(getFile(index, HUAFILE.files_total));
                            $(this).siblings('.delfilebtn').unbind();
                        });
                    }
                    //为删除文件按钮绑定删除文件事件
                    $('.delfilebtn').die().bind('click', function() {
                        var index = parseInt($(this).parent('li').attr('id'));
                        HUAFILE.funDeleteFile(index);
                        // HUAFILE.onDelete(index);
                    });

                }
                ,
                //文件删除后
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

                //删除对应的文件
                funDeleteFile: function(num) {
                    console.log(num)
                    for(file of HUAFILE.files_total){
                        console.log(file);
                        if (file['index'] == num) {
                            // console.log(HUAFILE.files_total.splice(num, 1));
                            delete (HUAFILE.files_total)[num];
                            console.log(HUAFILE.files_total) 
                            this.onDelete(num);
                            return this;
                        }
                    }
                    return this;
                },

                //文件上传
                funUploadFile: function(file) {
                    HUAFILE.ajax_upload = setInterval((HUAFILE.html5_ajax_slice_upload(file)), 1000);
                },

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
                    // 文件key  用于标识唯一文件
                    // var time = new Date().getTime();
                    return function() {
                        if (go == false || error){
                            clearInterval(HUAFILE.ajax_upload);
                            return;
                        }
                        //文件总大小
                        size = file.size;
                        //当起始点超过文件总大小,退出上传.
                        if (begin > size) {
                            clearInterval(HUAFILE.ajax_upload);
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
                        xhr.timeout = option.ajax_timeout;
                        // 请求超时处理
                        xhr.ontimeout = function() {
                            go = false;
                            self.onProgress(file, 0, size);
                            if (!error) {
                                self.onUploadError(file, '网络请求超时');
                                error = 1;
                            }
                            return;
                        }
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

                                    self.onUploadComplete();

                                }
                                // else {
                                // 	self.onUploadError(file, xhr.responseText);		
                                // }
                            }
                        };

                        option.onUploadStart();
                        //建立连接   true异步   false同步
                        xhr.open('POST', self.url, true);
                        //分割文件
                        blob = file.slice(begin, end);
                        //数据对象
                        data = new FormData();
                        data.append('files', blob, file['name']);
                        data.append('fileName', file['time']);  // 文件唯一标识
                        data.append('fileSize', size); // 用于后台判断文件是否上传完
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
