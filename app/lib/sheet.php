<?php

/**
 * Sheet - CSV and Excel tools
 *
 * The contents of this file are subject to the terms of the GNU General
 * Public License Version 3.0. You may not use this file except in
 * compliance with the license. Any of the license terms and conditions
 * can be waived if you get permission from the copyright holder.
 *
 * (c) Christian Knuth
 *
 * @date: 16.03.2015
 * @version 0.4.1
 */


class Sheet extends \Prefab {

    /**
     * multiline-aware CSV parser
     * @param $filepath
     * @param string $delimiter
     * @param string $enclosure
     * @return array|bool
     */
    public function parseCSV($filepath,$delimiter=";",$enclosure='"') {
        if (!is_file($filepath)) {
            user_error('File not found: '.$filepath);
            return false;
        }
        $data = \Base::instance()->read($filepath,true);

        if(!preg_match_all('/((?:.*?)'.$delimiter.'(?:'.$enclosure.'.*?'.
            $enclosure.'|['.$delimiter.'(?:\d|\.|\/)*\d])*\n)/s',$data,$matches))
            user_error('no rows found');

        $out = array_map(function($val) use($delimiter,$enclosure) {
            return str_getcsv($val,$delimiter,$enclosure);
        },$matches[0]);
        return $out;
    }

    /**
     * use specified headers or first row as label for each row item key
     * @param $rows
     * @param null $headers
     * @return array
     */
    public function applyHeader($rows,$headers=null) {
        if (!$headers)
            $headers=array_shift($rows);
        return array_map(function($row) use($headers) {
            return array_combine(array_values($headers),array_values($row));
        },$rows);
    }

    /**
     * build and return xls file data
     * @param $rows
     * @param $headers
     * @return string
     */
    public function dumpXLS($rows,$headers) {
        $numColumns = count($headers);
        $numRows = count($rows);
        foreach($headers as $key=>$val)
            if (is_numeric($key)) {
                $headers[$val]=ucfirst($val);
                unset($headers[$key]);
            }
        $xls = $this->xlsBOF();
        for ($i = 0; $i <= $numRows; $i++) {
            for ($c = 0; $c <= $numColumns; $c++) {
                $ckey = key($headers);
                $val='';
                if ($i==0)
                    $val = current($headers);
                elseif (isset($rows[$i-1][$ckey]))
                    $val = trim($rows[$i-1][$ckey]);
                if (is_array($val))
                    $val = json_encode($val);
                $xls.= (is_int($val)
                    || (ctype_digit($val) && ($val[0]!='0' && strlen($val)>1)))
                    ? $this->xlsWriteNumber($i,$c,$val)
                    : $this->xlsWriteString($i,$c,utf8_decode($val));
                next($headers);
            }
            reset($headers);
        }
        $xls .= $this->xlsEOF();
        return $xls;
    }

    /**
     * render xls file and send to HTTP client
     * @param $rows
     * @param $headers
     * @param $filename
     */
    function renderXLS($rows,$headers,$filename) {
        $data = $this->dumpXLS($rows,$headers);
        header("Expires: 0");
        header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
        header('Content-Type: application/xls');
        header("Content-Disposition: attachment;filename=".$filename);
        header("Content-Transfer-Encoding: binary");
        echo $data;
        exit();
    }

    /**
     * start file
     * @return string
     */
    protected function xlsBOF() {
        return pack("ssssss", 0x809, 0x8, 0x0, 0x10, 0x0, 0x0);
    }

    /**
     * end file
     * @return string
     */
    protected function xlsEOF() {
        return pack("ss", 0x0A, 0x00);
    }

    /**
     * put number
     * @param $row
     * @param $col
     * @param $val
     * @return string
     */
    protected function xlsWriteNumber($row, $col, $val) {
        $out = pack("sssss", 0x203, 14, $row, $col, 0x0);
        $out.= pack("d", $val);
        return $out;
    }

    /**
     * put string
     * @param $row
     * @param $col
     * @param $val
     * @return string
     */
    protected function xlsWriteString($row, $col, $val ) {
        $l = strlen($val);
        $out = pack("ssssss", 0x204, 8+$l, $row, $col, 0x0, $l);
        $out.= $val;
        return $out;
    }

    /**
     * build and return CSV data sheet
     * @param $rows
     * @param $headers
     * @param string $delimiter
     * @param string $enclosure
     * @param bool $encloseAll
     * @return string
     */
    public function dumpCSV($rows,$headers,$delimiter=';',$enclosure='"',$encloseAll=true) {
        $numColumns = count($headers);
        $numRows = count($rows);
        foreach($headers as $key=>$val)
            if (is_numeric($key)) {
                $headers[$val]=ucfirst($val);
                unset($headers[$key]);
            }
        $out = array();
        for ($i = 0; $i <= $numRows; $i++) {
            $line = array();
            for ($c = 0; $c <= $numColumns; $c++) {
                $ckey = key($headers);
                $field='';
                if ($i==0)
                    $field = current($headers);
                elseif (isset($rows[$i-1][$ckey]))
                    $field = trim($rows[$i-1][$ckey]);
                if (is_array($field))
                    $field = json_encode($field);
                if (empty($field) && $field !== 0)
                    $line[] = '';
                elseif ($encloseAll || preg_match('/(?:'.preg_quote($delimiter, '/').'|'.
                        preg_quote($enclosure, '/').'|\s)/', $field))
                    $line[] = $enclosure.str_replace($enclosure, $enclosure.$enclosure, $field).$enclosure;
                else
                    $line[] = $field;
                next($headers);
            }
            $out[] = implode($delimiter, $line);
            reset($headers);
        }
        return implode("\n",$out);
    }

    /**
     * send CSV file to client
     * @param $rows
     * @param $headers
     * @param $filename
     */
    function renderCSV($rows,$headers,$filename) {
        $data = $this->dumpCSV($rows,$headers);
        header("Expires: 0");
        header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
        header('Content-Type: text/csv;charset=UTF-16LE');
        header("Content-Disposition: attachment;filename=".$filename);
        header("Content-Transfer-Encoding: binary");
        echo "\xFF"."\xFE".mb_convert_encoding($data, 'UTF-16LE', 'UTF-8');
        exit();
    }

}