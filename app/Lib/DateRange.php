<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 29.11.2018
 * Time: 18:06
 */

namespace Exodus4D\Pathfinder\Lib;

use Exodus4D\Pathfinder\Exception\DateException;

class DateRange {

    /**
     * from range start
     * @var \DateTime
     */
    protected $from;

    /**
     * to range end
     * @var \DateTime
     */
    protected $to;

    /**
     * DateRange constructor.
     * @param \DateTime $from
     * @param \DateTime $to
     * @throws DateException
     */
    public function __construct(\DateTime $from, \DateTime $to){
        if($from == $to){
            throw new DateException('A period cannot be the same time', 3000);
        }else{
            if($from < $to){
                $this->from = $from;
                $this->to = $to;
            } else {
                $this->from = $to;
                $this->to = $from;
            }
        }
    }

    /**
     * check if DateTime $dateCheck is within this range
     * @param \DateTime $dateCheck
     * @return bool
     */
    public function inRange(\DateTime $dateCheck) : bool {
        return $dateCheck >= $this->from && $dateCheck <= $this->to;
    }
}