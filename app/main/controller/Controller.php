<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 23:48
 */

namespace Controller;

class Controller {

    protected $f3;
    private $template;

    /**
     * @param mixed $template
     */
    public function setTemplate($template){
        $this->template = $template;
    }

    /**
     * @return mixed
     */
    public function getTemplate(){
        return $this->template;
    }

    function __construct(){

        $f3 = \Base::instance();
        $this->f3 = $f3;
    }

    /**
     * event handler
     */
    function beforeroute() {
        // init DB
        $this->setDB('PF');
    }

    /**
     * event handler
     */
    function afterroute() {
        if($this->template){
            echo \Template::instance()->render( $this->template );

        }
    }

    protected function setDB($type){

        if($type === 'CCP'){
            // CCP DB
            $db = new \DB\SQL(
                $this->f3->get('DB_CCP_DNS') . $this->f3->get('DB_CCP_NAME'),
                $this->f3->get('DB_CCP_USER'),
                $this->f3->get('DB_CCP_PASS')
            );
        }else{
            // Pathfinder DB
            $db = new \DB\SQL(
                $this->f3->get('DB_DNS') . $this->f3->get('DB_NAME'),
                $this->f3->get('DB_USER'),
                $this->f3->get('DB_PASS')
            );
        }

        $this->f3->set('DB', $db);

    }


    public function showLogin(){
        $this->setTemplate('templates/view/login.html');
    }


} 