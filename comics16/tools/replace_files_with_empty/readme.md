go build clean_files.go
./clean_files.exe -dir "F:\games\comics\h_photograph\林_希_威"

# 参数说明
# -dir     : 必填，根目录路径
# -ext     : 扩展名过滤，默认 .jpg,.jpeg,.png,.gif,.bmp
# -workers : 并发数，默认 16

命令行参数
clean_files.exe -dir "F:\path\to\comics" -ext ".jpg,.png" -workers 32