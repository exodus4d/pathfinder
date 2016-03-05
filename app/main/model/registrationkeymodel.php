<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 29.08.15
 * Time: 11:57
 */

namespace Model;

use DB\SQL\Schema;

class RegistrationKeyModel extends BasicModel {

    protected $table = 'registration_key';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'ip' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'used' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'email' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'index' => true
        ],
        'registrationKey' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'index' => true,
            'unique' => true
        ]
    ];

} 