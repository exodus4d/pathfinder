<div class="pf-splash">
    <div class="pf-color-line"></div>
    <div class="pf-splash-title">
        <h1>PATHFINDER - System Mapping Tool</h1>
        <p>
            <em class="pf-brand">pathfinder</em> is an open source mapping tool for <em class="pf-brand"><a href="http://www.eveonline.com/" target="_blank">EVE ONLINE</a></em>.
        </p>
        <img src="public/img/loading-bars.svg" width="48" height="48">
    </div>
</div>

<nav class="navbar navbar-default navbar-fixed-top">
    <div class="container">
        <div id="pf-head" class="navbar-header">
            <button aria-controls="navbar" aria-expanded="false" data-target="#navbar" data-toggle="collapse" class="navbar-toggle collapsed" type="button">
                <span class="sr-only">Toggle navigation</span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
            </button>
            <a href="index.html" class="navbar-brand">Register</a>
            <p class="navbar-text">
                <span class="badge txt-color txt-color-grayLight">v.0.02 beta</span>
            </p>

        </div>
        <div id="navbar" class="navbar-collapse collapse">
            <ul class="nav navbar-nav navbar-right">
                <li class="active">
                    <a class="page-scroll" href="#page-top">Home</a>
                </li>
                <li>
                    <a class="page-scroll" href="#pf-landing-login">Login</a>
                </li>
                <li>
                    <a class="page-scroll" href="#pf-landing-contact">Contact</a>
                </li>
            </ul>
        </div>
    </div>
</nav>

<header id="page-top">
    <div class="container">
        <div id="pf-logo-container" class="pull-left"></div>

        <div id="pf-header">
            <div id="pf-header-systems" class="pf-header-svg-layer"></div>
            <div id="pf-header-connectors" class="pf-header-svg-layer"></div>
            <div id="pf-header-connections" class="pf-header-svg-layer"></div>
            <div id="pf-header-background" class="pf-header-svg-layer">
                <?php echo $this->render('templates/ui/header_bg.html',$this->mime,get_defined_vars()); ?>
                
            </div>
        </div>

        <div class="heading">


        </div>
    </div>
</header>


<section id="pf-landing-login">
    <div class="container">
        <div class="row text-center">
            <div class="col-md-8 col-md-offset-2">
                <h2><span class="text-primary">Please</span> log in</h2>
            </div>
        </div>
        <form class="form-horizontal" role="form" method="post" action="#">
            <div class="row text-center m-t-lg">
                <div class="col-md-4 col-md-offset-2">
                    <div class="form-group">
                        <label for="userName" class="col-sm-2 control-label">Username</label>
                        <div class="col-sm-10">
                            <input type="text" class="form-control" id="userName" name="userName" placeholder="Your username" value="">
                        </div>
                    </div>
                </div>
                <div class="col-md-4 ">
                    <div class="form-group">
                        <label for="userMail" class="col-sm-2 control-label">Email</label>
                        <div class="col-sm-10">
                            <input type="email" class="form-control" id="userMail" name="userMail" placeholder="user@example.com" value="">
                        </div>
                    </div>
                </div>
            </div>
            <div class="row text-center m-t-lg">
                <div class="col-md-6 col-md-offset-3">
                    <div class="col-sm-3 col-sm-offset-3">
                        <button class="btn-block btn btn-primary"><i class="fa fa-fw fa-user-plus"></i> Register</button>

                    </div>
                    <div class="col-sm-3">
                        <button class="btn-block btn btn-success"><i class="fa fa-fw fa-sign-in"></i> Login</button>

                    </div>
                </div>
            </div>
        </form>
    </div>
</section>



<section id="pf-landing-contact">
    <div class="container">
        <div class="row text-center">
            <div class="col-md-6 col-md-offset-3">
                <h2><span class="text-primary">Contact with us</span> anytime</h2>
                <p>
                    Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes.
                </p>
            </div>
        </div>
        <div class="row text-center m-t-lg">
            <div class="col-md-4 col-md-offset-3">

                <form class="form-horizontal" role="form" method="post" action="#">
                    <div class="form-group">
                        <label for="name" class="col-sm-2 control-label">Name</label>

                        <div class="col-sm-10">
                            <input type="text" class="form-control" id="name" name="name" placeholder="Your full name" value="">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="email" class="col-sm-2 control-label">Email</label>

                        <div class="col-sm-10">
                            <input type="email" class="form-control" id="email" name="email" placeholder="user@example.com" value="">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="message" class="col-sm-2 control-label">Message</label>

                        <div class="col-sm-10">
                            <textarea class="form-control" rows="3" name="message" placeholder="Your message here..."></textarea>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="col-sm-12">
                            <input id="submit" name="submit" type="submit" value="Send us a message" class="btn btn-success">
                        </div>
                    </div>
                </form>

            </div>
            <div class="col-md-3 text-left">
                <address>
                    <strong><span class="navy">Company name, Inc.</span></strong><br>
                    601 Street name, 123<br>
                    New York, De 34101<br>
                    <abbr title="Phone">P:</abbr> (123) 678-8674
                </address>
                <p class="text-color">
                    Consectetur adipisicing elit. Aut eaque, totam corporis laboriosam veritatis quis ad perspiciatis, totam corporis laboriosam veritatis, consectetur adipisicing elit quos non quis ad perspiciatis, totam corporis ea,
                </p>
            </div>
        </div>
    </div>
</section>