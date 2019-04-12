<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 06.08.2017
 * Time: 18:47
 */

namespace data\file;


class FileHandler extends \Prefab {

    const ERROR_STREAM_READABLE                             = 'Stream is not readable "%s"';

    const LOG_FILE_OFFSET_MIN                               = 0;
    const LOG_FILE_OFFSET                                   = 0;
    const LOG_FILE_OFFSET_MAX                               = 10000;
    const LOG_FILE_LIMIT_MIN                                = 1;
    const LOG_FILE_LIMIT                                    = 100;
    const Log_File_LIMIT_MAX                                = 100;

    /**
     * parse file from end to first line
     * @param string $sourceFile
     * @param int $offset
     * @param int $limit
     * @param \Closure|null $rowParser
     * @return array
     */
    public function readFileReverse(
        string $sourceFile,
        int $offset = self::LOG_FILE_OFFSET,
        int $limit = self::LOG_FILE_LIMIT,
        \Closure $rowParser = null
    ) : array {
        $data = [];

        if(is_file($sourceFile)){
            if(is_readable($sourceFile)){
                $file = new ReverseSplFileObject($sourceFile, $offset);
                $file->setFlags(\SplFileObject::DROP_NEW_LINE | \SplFileObject::READ_AHEAD | \SplFileObject::SKIP_EMPTY);

                foreach( new \LimitIterator($file, 0, $limit) as $i => $rowData){
                    if(is_callable($rowParser)){
                        // custom parser for row data -> manipulate $data by ref
                        $rowParser($rowData, $data);
                    }else{
                        $data[] = $rowData;
                    }
                }
            }else{
                \Base::instance()->error(500, sprintf(self::ERROR_STREAM_READABLE, $sourceFile));
            }
        }

        return $data;
    }

    /**
     * validate offset
     * @param int $offset
     * @return int
     */
    public static function validateOffset(int $offset): int{
        if(
            $offset < self::LOG_FILE_OFFSET_MIN ||
            $offset > self::LOG_FILE_OFFSET_MAX
        ){
            $offset = self::LOG_FILE_OFFSET;
        }
        return $offset;
    }

    /**
     * validate limit
     * @param int $limit
     * @return int
     */
    public static function validateLimit(int $limit): int{
        if(
            $limit < self::LOG_FILE_LIMIT_MIN ||
            $limit > self::Log_File_LIMIT_MAX
        ){
            $limit = self::LOG_FILE_LIMIT;
        }
        return $limit;
    }
}