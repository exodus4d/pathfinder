<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 21:18
 */

namespace Controller;

class MapController extends Controller {

    function __construct() {
        parent::__construct();
    }


    public function showMap() {
        $this->setTemplate('templates/view/map.html');

    }

    /**
     * function is called on each error
     * @param $f3
     */
    public function showError($f3){
        print_r($f3->get('ERROR'));

        // set HTTP status
        if(!empty($f3->get('ERROR.code'))){
            $f3->status($f3->get('ERROR.code'));
        }

        if($f3->get('AJAX')){
            header('Content-type: application/json');

            // error on ajax call
            $errorData = [
                'status' => $f3->get('ERROR.status'),
                'code' => $f3->get('ERROR.code'),
                'text' => $f3->get('ERROR.text')
            ];

            echo json_encode($errorData);
        }else{
            echo 'TODO: static errors';
        }

        die();
    }

} 