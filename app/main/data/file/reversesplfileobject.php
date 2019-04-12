<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 06.08.2017
 * Time: 18:42
 */

namespace data\file;


class ReverseSplFileObject extends \SplFileObject{

    /**
     * pointer position indicates file start
     * @var int
     */
    protected $begin            = 0;

    /**
     * line offset from file end (1 => 'start with 2nd last line')
     * @var int
     */
    protected $offset           = 0;

    /**
     * total lines found in file
     * @var int
     */
    protected $lineCount        = 0;

    /**
     * empty lines found in file
     * @var int
     */
    protected $lineCountEmpty   = 0;

    /**
     * current pointer position
     * @var int
     */
    protected $pointer          = 0;

    /**
     * position increments when valid row data found
     * @var
     */
    protected $position;

    /**
     * control characters
     * @var array
     */
    protected $eol = ["\r", "\n"];

    public function __construct($sourceFile, $offset = 0){
        parent::__construct($sourceFile);

        // set total line count of the file
        $this->setLineCount();

        //Seek to the first position of the file and record its position
        //Should be 0
        $this->fseek(0);
        $this->begin = $this->ftell();
        $this->offset = $offset;

        //Seek to the last position from the end of the file
        //This varies depending on the file
        $this->fseek($this->pointer, SEEK_END);
    }

    /**
     * reverse rewind file.
     */
    public function rewind(){
        //Set the line position to 0 - First Line
        $this->position = 0;

        //Reset the file pointer to the end of the file minus 1 character. "0" == false
        $this->fseek(-1, SEEK_END);

        $this->findLineBegin();
        //... File pointer is now at the beginning of the last line that contains data

        // add custom line offset
        if($this->offset){
            // calculate offset start line
            $offsetLine = $this->lineCount - $this->lineCountEmpty - $this->offset;

            if($offsetLine > 0){
                // row is zero based
                $offsetIndex = $offsetLine - 1;

                parent::seek($offsetIndex);
                // seek() sets pointer to next line... set it back to previous
                $this->fseek(-2, SEEK_CUR);

                $this->findLineBegin();
                //... File pointer is now at the beginning of the last line that contains data from $offset
            }else{
                // negative offsetLine -> invalid!
                $this->pointer = $this->begin -1;
            }

        }
    }

    /**
     * Return the current line after the file pointer
     * @return string
     */
    public function current(){
        return trim($this->fgets());
    }

    /**
     * Return the current key of the line we're on
     * These go in reverse order
     * @return mixed
     */
    public function key(){
        return $this->position;
    }

    /**
     * move one line up
     */
    public function next(){
        //Step the file pointer back one step to the last letter of the previous line
        --$this->pointer;
        if($this->pointer < $this->begin){
            return;
        }

        $this->fseek($this->pointer);

        $this->findLineBegin();

        //File pointer is now on the next previous line
        //Increment the line position
        ++$this->position;
    }

    /**
     * Check the current file pointer to make sure we  are not at the beginning of the file
     * @return bool
     */
    public function valid(){
        return ($this->pointer >= $this->begin);
    }

    /**
     * seek to previous lines
     * @param int $lineCount
     */
    public function seek($lineCount){
        for($i = 0; $i < $lineCount; $i++){
            $this->next();
        }
    }

    /**
     * move pointer to line begin
     * -> skip line breaks
     */
    private function findLineBegin(){
        //Check the character over and over till we hit another new line
        $c = $this->fgetc();

        // skip empty lines
        while(in_array($c, $this->eol)){
            $this->fseek(-2, SEEK_CUR);
            if(!$this->pointer = $this->ftell()){
                break;
            }
            $c = $this->fgetc();

            $this->lineCountEmpty++;
        }

        //Check the last character to make sure it is not a new line
        while(!in_array($c, $this->eol)){
            $this->fseek(-2, SEEK_CUR);
            if(!$this->pointer = $this->ftell()){
                break;
            }
            $c = $this->fgetc();
        }
    }

    /**
     * set total line count. No matter if there are empty lines in between
     */
    private function setLineCount(){
        // Store flags and position
        $flags = $this->getFlags();
        $currentPointer = $this->ftell();

        // Prepare count by resetting flags as READ_CSV for example make the tricks very slow
        $this->setFlags(null);

        // Go to the larger INT we can as seek will not throw exception, errors, notice if we go beyond the bottom line
        //$this->seek(PHP_INT_MAX);
        parent::seek(PHP_INT_MAX);

        // We store the key position
        // As key starts at 0, we add 1
        $this->lineCount = parent::key() + 1;

        // We move to old position
        // As seek method is longer with line number < to the max line number, it is better to count at the beginning of iteration
        //parent::seek($currentPointer);
        $this->fseek($currentPointer);

        // Re set flags
        $this->setFlags($flags);
    }
}