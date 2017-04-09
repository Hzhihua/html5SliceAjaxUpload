<?php
// sleep(5);
// 文件锁  防止出现多线程问题
$sock_file = 'sock.txt';
$fp = fopen($sock_file, 'w');
flock($fp, LOCK_EX) or die('Lock Error');
fwrite($fp, 'fileSock');

$fileName = date('YmdHis', substr($_POST['fileName'], 0, strlen($_POST['fileName'])-3));
$ext = pathinfo($_FILES['files']['name'], PATHINFO_EXTENSION); //文件后缀
$path = '../uploads/' . $fileName .'.'. $ext;

if($_FILES['files']['error'] == 0){
	if(!file_exists($path)) {  
	    move_uploaded_file($_FILES['files']['tmp_name'],$path);
	} elseif($_POST['fileSize'] > filesize($path)) {
	    file_put_contents($path,file_get_contents($_FILES['files']['tmp_name']),FILE_APPEND);
	}
	
	echo $_FILES['files']['size'];  // 进度条数据
}


flock($fp, LOCK_UN);
fclose($fp);
