<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the controller to call when that URI is requested.
|
*/

/**
 * Older versions of lumen dont auto reslove to the App\Http\Controllers namespace
 *
 * Preceding backslash added to remain compatible in newer versions
 */
$app->get('/', ['as' => 'home', 'uses' => '\App\Http\Controllers\PagesController@noprotocol']);
$app->get('robots.txt', ['as' => 'robots', 'uses' => '\App\Http\Controllers\RobotsController@index']);
