<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 22:11
 */

namespace Model;


use Exception;

class BasicModel extends \DB\Cortex{

    protected $db = 'DB';

    /**
     * field validation array
     * @var array
     */
    protected $validate = [];

    /**
     * overwrites magic __set() mainly used for validation
     * @param string $col
     * @param \scalar $val
     * @return mixed|void
     * @throws \Exception\ValidationException
     */
    public function __set($col, $val){

        // never set updated field
        if($col == 'updated'){
            return;
        }

        // trim all values
        if(is_string($val)){
            $val = trim($val);
        }

        $valid = $this->_validateField($col, $val);

        if(!$valid){
            throw new Exception\ValidationException('Field validation: "' . $this->table . '->' . $col . '" not valid', Exception\BaseException::VALIDATION_FAILED);
        }else{
            parent::__set($col, $val);
        }
    }

    /**
     * validates a table column based on validation settings
     * @param $col
     * @param $val
     * @return bool
     */
    private function _validateField($col, $val){
        $valid = true;

        if(array_key_exists($col, $this->validate)){

            $fieldValidationOptions = $this->validate[$col];

            foreach($fieldValidationOptions as $validateKey => $validateOption ){
                if(is_array($fieldValidationOptions[$validateKey])){
                    $fieldSubValidationOptions = $fieldValidationOptions[$validateKey];

                    foreach($fieldSubValidationOptions as $validateSubKey => $validateSubOption ){
                        switch($validateKey){
                            case 'length':
                                switch($validateSubKey){
                                    case 'min';
                                        if(strlen($val) < $validateSubOption){
                                            $valid = false;
                                        }
                                        break;
                                    case 'max';

                                        if(strlen($val) > $validateSubOption){
                                            $valid = false;
                                        }
                                        break;
                                }

                                break;
                        }
                    }

                }else{
                    switch($validateKey){
                        case 'regex':
                           $valid = (bool)preg_match($fieldValidationOptions[$validateKey], $val);
                            break;
                    }
                }

                // a validation rule failed
                if(!$valid){
                    break;
                }

            }
        }

        return $valid;
    }


    /**
     * get single dataSet by id
     * @param $id
     * @return array|FALSE
     */
    public function getById($id) {
        return $this->getByForeignKey('id', (int)$id, array('limit' => 1));
    }

    /**
     * get dataSet by foreign column
     * @param $key
     * @param $id
     * @param $options
     * @return array|FALSE
     */
    public function getByForeignKey($key, $id, $options = array()){

        $querySet = [];
        $query = [];
        if($this->exists($key)){
            $query[] = $key . " = :" . $key;
            $querySet[':' . $key] = $id;
        }

        // check active column
        if($this->exists('active')){
            $query[] = "active = :active";
            $querySet[':active'] = 1;
        }

        array_unshift($querySet, implode(' AND ', $query));

        return $this->load( $querySet, $options );
    }

    /**
     * get multiple model obj that have an 1->m relation to this model
     * @param $model
     * @param $foreignKey
     * @return mixed
     */
    public function getRelatedModels($model, $foreignKey){
        $model = self::getNew($model);
        $relatedModels = $model->find(array($foreignKey . ' = ? AND active = 1', $this->id), null, 10);

        return $relatedModels;
    }

    /**
     * factory for all Models
     * @param $model
     * @return null
     * @throws \Exception
     */
    public static function getNew($model){
        $class = null;

        $model = '\\' . __NAMESPACE__ . '\\' . $model;
        if(class_exists($model)){
            $class = new $model();
        }else{
            throw new \Exception('No model class found');
        }

        return $class;
    }

} 