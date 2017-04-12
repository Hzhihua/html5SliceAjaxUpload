<?php
// sleep(5);
// 文件锁  防止出现多线程问题
$sock_file = 'sock.txt';
$fp = fopen($sock_file, 'w');
flock($fp, LOCK_EX) or die('Lock Error');
fwrite($fp, 'fileSock');

if($_FILES['files']['error'] == 0){
	$time = substr($_POST['fileName'], 0, strlen($_POST['fileName'])-3);
	$rootdir = '../uploads/' ;
	$dir = date('Ymd', $time) . '/';
	if(!is_dir($rootdir . $dir)){
		mkdir($rootdir . $dir, 0755, true);
	}
	$fileName = date('His', $time);
	$ext = pathinfo($_FILES['files']['name'], PATHINFO_EXTENSION); //文件后缀
	$path = $rootdir . $dir . $fileName .'.'. $ext;

	// 上传中断重新上传
	if($_POST['first'] == 'true'){
		@unlink($path);
	}

	if(!file_exists($path)) {  
	    move_uploaded_file($_FILES['files']['tmp_name'],$path);
	} elseif($_POST['fileSize'] > filesize($path)) {
	    file_put_contents($path,file_get_contents($_FILES['files']['tmp_name']),FILE_APPEND);
	}
	
	echo $_FILES['files']['size'];  // 进度条数据
	// $_SESSION['files'][$time] = $dir . $fileName .'.'. $ext;
}


flock($fp, LOCK_UN);
fclose($fp);
